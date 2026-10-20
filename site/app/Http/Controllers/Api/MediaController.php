<?php

namespace App\Http\Controllers\Api;

use App\Support\Api;
use App\Support\Auth;
use App\Support\Docs;
use App\Support\Profiles;
use App\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Photos and videos of a profile. New uploads wait for an admin ("pending"); approved photos are
 * listed in the profile's `photos`, approved videos are read from provider_media.
 */
class MediaController
{
    /** Text drawn on every uploaded photo: white, 40% opacity, centred. */
    private const WATERMARK = 'eliteescortseurope.eu';
    private const WATERMARK_OPACITY = 0.4;
    private const WATERMARK_WIDTH = 0.55;   // share of the photo's width the text takes
    private const MAX_SIDE = 2000;          // larger photos are scaled down to this (pixels, longest side)

    private const TYPES = [
        'image/jpeg' => ['photo', '.jpg'], 'image/png' => ['photo', '.png'], 'image/webp' => ['photo', '.webp'],
        'video/mp4' => ['video', '.mp4'], 'video/quicktime' => ['video', '.mov'],
    ];

    public function mine(Request $request)
    {
        $me = Auth::user($request);
        $profile = Profiles::editable($me, $request->query('provider_id'));
        if (!$profile) {
            Api::fail(404, 'Profile not found');
        }
        $photos = $profile['photos'] ?? [];
        $items = [];
        $seen = [];
        foreach (Docs::find('provider_media', ['provider_id' => $profile['provider_id']], 'uploaded_at', 'asc', 200) as $m) {
            $items[] = [
                'media_id' => $m['media_id'] ?? null, 'url' => $m['url'] ?? null, 'media_type' => $m['media_type'] ?? 'photo',
                'status' => $m['status'] ?? 'approved', 'file_name' => $m['file_name'] ?? null, 'position' => $m['position'] ?? null,
            ];
            if (!empty($m['url'])) {
                $seen[$m['url']] = true;
            }
        }
        // Approved photos stored directly on the profile but not tracked in provider_media
        foreach ($photos as $i => $url) {
            if (!isset($seen[$url])) {
                $items[] = ['media_id' => "photo_$i", 'url' => $url, 'media_type' => 'photo', 'status' => 'approved'];
            }
        }
        // Order: photos as ordered on the profile (first = cover), then photos in review, then videos
        $rank = array_flip($photos);
        $key = function ($it) use ($rank) {
            if ($it['media_type'] === 'video') {
                return [2, $it['position'] ?? 0];
            }
            return isset($rank[$it['url']]) ? [0, $rank[$it['url']]] : [1, $it['position'] ?? 0];
        };
        $indexed = array_map(null, $items, array_keys($items));
        usort($indexed, fn ($a, $b) => [$key($a[0]), $a[1]] <=> [$key($b[0]), $b[1]]);
        return Api::json(['media' => array_column($indexed, 0)]);
    }

    public function upload(Request $request)
    {
        $me = Auth::user($request);
        $profile = Profiles::editable($me, $request->input('provider_id') ?: null);
        if (!$profile) {
            Api::fail(404, 'Create your profile first, then add photos and videos.');
        }
        $file = $request->file('file');
        if (!$file || !$file->isValid()) {
            if ($file && in_array($file->getError(), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                Api::fail(400, 'This file is larger than 10 MB. Choose a smaller file.');
            }
            Api::json(['detail' => [['type' => 'missing', 'loc' => ['body', 'file'], 'msg' => 'Field required', 'input' => null]]], 422)->throwResponse();
        }
        $kind = self::TYPES[strtolower((string) $file->getClientMimeType())] ?? null;
        if (!$kind) {
            Api::fail(400, 'Use JPG, PNG or WebP photos, or MP4 or MOV videos.');
        }
        if ($file->getSize() > config('eee.max_upload_bytes')) {
            Api::fail(400, 'This file is larger than 10 MB. Choose a smaller file.');
        }
        [$type, $ext] = $kind;
        $mediaId = 'media_'.substr(bin2hex(random_bytes(8)), 0, 16);
        $name = $mediaId.$ext;
        $dir = config('eee.upload_dir');
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $file->move($dir, $name);
        if ($type === 'photo') {
            self::watermark($dir, $name, $ext);
        }
        $last = Docs::find('provider_media', ['provider_id' => $profile['provider_id']]);
        $pos = $last ? max(array_map(fn ($m) => (int) ($m['position'] ?? 0), $last)) + 1 : 1;
        // Uploads by the admin need no review: they are approved and photos go straight onto the profile.
        $admin = $me['role'] === 'admin';
        $doc = [
            'media_id' => $mediaId,
            'provider_id' => $profile['provider_id'],
            'url' => '/api/media/files/'.$name,
            'media_type' => $type,
            'status' => $admin ? 'approved' : 'pending',
            'file_name' => mb_substr($file->getClientOriginalName() ?: $name, 0, 120),
            'position' => $pos,
            'uploaded_at' => Time::iso(Time::now()),
        ];
        if ($admin) {
            $doc['reviewed_at'] = $doc['uploaded_at'];
            $doc['reviewed_by'] = $me['user_id'];
        }
        Docs::insert('provider_media', $doc);
        if ($admin && $type === 'photo') {
            Docs::update('provider_profiles', ['provider_id' => $profile['provider_id']], function ($p) use ($doc) {
                $p['photos'] = array_values(array_unique(array_merge($p['photos'] ?? [], [$doc['url']])));
                return $p;
            });
        }
        return Api::json($doc);
    }

    public function file(string $name)
    {
        if (!preg_match('/^media_[0-9a-f]{16}\.(jpg|png|webp|mp4|mov)$/', $name)) {
            Api::fail(404, 'Not found');
        }
        $path = rtrim(config('eee.upload_dir'), '/').'/'.$name;
        if (!is_file($path)) {
            Api::fail(404, 'Not found');
        }
        return response()->file($path, ['Cache-Control' => 'public, max-age=31536000, immutable']);
    }

    public function destroy(Request $request, string $mediaId)
    {
        $me = Auth::user($request);
        $profile = Profiles::editable($me, $request->query('provider_id'));
        if (!$profile) {
            Api::fail(404, 'Profile not found');
        }
        $pid = $profile['provider_id'];
        if (str_starts_with($mediaId, 'photo_')) {
            $i = substr($mediaId, 6);
            $url = ctype_digit($i) ? ($profile['photos'][(int) $i] ?? null) : null;
            if ($url === null) {
                Api::fail(404, 'Photo not found');
            }
            self::pullPhoto($pid, $url);
            return Api::json(['status' => 'deleted']);
        }
        $m = Docs::first('provider_media', ['media_id' => $mediaId, 'provider_id' => $pid]);
        if (!$m) {
            Api::fail(404, 'Media not found');
        }
        Docs::delete('provider_media', ['media_id' => $mediaId]);
        self::pullPhoto($pid, $m['url'] ?? '');
        $file = rtrim(config('eee.upload_dir'), '/').'/'.basename((string) ($m['url'] ?? ''));
        if (is_file($file)) {
            @unlink($file);
        }
        $orig = rtrim(config('eee.upload_dir'), '/').'/originals/'.basename((string) ($m['url'] ?? ''));
        if (is_file($orig)) {
            @unlink($orig);
        }
        return Api::json(['status' => 'deleted']);
    }

    public function order(Request $request)
    {
        $me = Auth::user($request);
        $profile = Profiles::editable($me, $request->query('provider_id'));
        if (!$profile) {
            Api::fail(404, 'Profile not found');
        }
        $b = Api::validate(Api::body($request), ['urls' => 'strlist']);
        $pid = $profile['provider_id'];
        $rank = array_flip($b['urls']);
        $photos = $profile['photos'] ?? [];
        $keyed = [];
        foreach ($photos as $i => $u) {
            $keyed[] = [$rank[$u] ?? count($rank) + $i, $u];
        }
        usort($keyed, fn ($a, $b) => $a[0] <=> $b[0]);
        Docs::update('provider_profiles', ['provider_id' => $pid], ['photos' => array_column($keyed, 1)]);
        foreach ($rank as $u => $i) {
            foreach (Docs::find('provider_media', ['provider_id' => $pid]) as $m) {
                if (($m['url'] ?? null) === $u) {
                    Docs::update('provider_media', ['media_id' => $m['media_id']], ['position' => $i]);
                }
            }
        }
        return Api::json(['status' => 'ok']);
    }

    /**
     * Put the site's watermark on an uploaded photo. The photo is also turned upright (phone photos), scaled down
     * to MAX_SIDE and saved without its EXIF data (no camera or GPS details). The untouched original is kept in
     * uploads/originals/, which is never shown on the site. If the server can't do this (no GD), the photo stays as it is.
     */
    private static function watermark(string $dir, string $name, string $ext): void
    {
        $path = rtrim($dir, '/').'/'.$name;
        $font = resource_path('fonts/watermark.ttf');
        if (!function_exists('imagettftext') || !is_file($font)) {
            Log::warning('Watermark skipped: PHP GD with FreeType or the font is missing', ['file' => $name]);
            return;
        }
        @ini_set('memory_limit', '512M');
        try {
            $img = match ($ext) {
                '.jpg' => @imagecreatefromjpeg($path),
                '.png' => @imagecreatefrompng($path),
                '.webp' => @imagecreatefromwebp($path),
                default => false,
            };
            if (!$img) {
                Log::warning('Watermark skipped: photo could not be read', ['file' => $name]);
                return;
            }
            $origDir = rtrim($dir, '/').'/originals';
            if (!is_dir($origDir)) {
                @mkdir($origDir, 0775, true);
            }
            @copy($path, $origDir.'/'.$name);

            // Upright, as the phone took it
            if ($ext === '.jpg' && function_exists('exif_read_data')) {
                $o = (int) (@exif_read_data($path)['Orientation'] ?? 1);
                $angle = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
                if ($angle) {
                    $img = imagerotate($img, $angle, 0);
                }
            }
            // Not larger than needed
            $w = imagesx($img);
            $h = imagesy($img);
            if (max($w, $h) > self::MAX_SIDE) {
                $f = self::MAX_SIDE / max($w, $h);
                $img = imagescale($img, (int) round($w * $f), (int) round($h * $f), IMG_BICUBIC);
                $w = imagesx($img);
                $h = imagesy($img);
            }
            imagealphablending($img, true);
            imagesavealpha($img, true);

            // Text size so it takes WATERMARK_WIDTH of the width, centred both ways
            $box = imagettfbbox(100, 0, $font, self::WATERMARK);
            $size = 100 * ($w * self::WATERMARK_WIDTH) / max(1, $box[2] - $box[0]);
            $box = imagettfbbox($size, 0, $font, self::WATERMARK);
            $tw = $box[2] - $box[0];
            $th = $box[1] - $box[7];
            $x = (int) round(($w - $tw) / 2 - $box[0]);
            $y = (int) round(($h + $th) / 2 - $box[1]);
            $white = imagecolorallocatealpha($img, 255, 255, 255, (int) round(127 * (1 - self::WATERMARK_OPACITY)));
            imagettftext($img, $size, 0, $x, $y, $white, $font, self::WATERMARK);

            $ok = match ($ext) {
                '.jpg' => imagejpeg($img, $path, 90),
                '.png' => imagepng($img, $path, 6),
                '.webp' => imagewebp($img, $path, 88),
            };
            if (!$ok) {
                Log::warning('Watermark: saving the photo failed', ['file' => $name]);
            }
        } catch (\Throwable $e) {
            Log::warning('Watermark failed: '.$e->getMessage(), ['file' => $name]);
        }
    }

    /** Remove one URL from a profile's photos. */
    public static function pullPhoto(string $providerId, string $url): void
    {
        Docs::update('provider_profiles', ['provider_id' => $providerId], function ($d) use ($url) {
            $d['photos'] = array_values(array_filter($d['photos'] ?? [], fn ($p) => $p !== $url));
            return $d;
        });
    }
}
