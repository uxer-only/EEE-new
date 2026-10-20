<?php

namespace App\Http\Controllers\Api;

use App\Support\Api;
use App\Support\Auth;
use App\Support\Docs;
use App\Support\Profiles;
use App\Support\Time;
use Illuminate\Http\Request;

/**
 * Photos and videos of a profile. New uploads wait for an admin ("pending"); approved photos are
 * listed in the profile's `photos`, approved videos are read from provider_media.
 */
class MediaController
{
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

    /** Remove one URL from a profile's photos. */
    public static function pullPhoto(string $providerId, string $url): void
    {
        Docs::update('provider_profiles', ['provider_id' => $providerId], function ($d) use ($url) {
            $d['photos'] = array_values(array_filter($d['photos'] ?? [], fn ($p) => $p !== $url));
            return $d;
        });
    }
}
