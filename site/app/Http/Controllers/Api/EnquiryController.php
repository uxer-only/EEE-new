<?php

namespace App\Http\Controllers\Api;

use App\Support\Api;
use App\Support\Auth;
use App\Support\Docs;
use App\Support\Emails;
use App\Support\Mail;
use App\Support\Profiles;
use App\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Requests visitors send from a profile page, the advertiser's inbox and replies (by e-mail),
 * and "report this profile as fake".
 */
class EnquiryController
{
    public function create(Request $request)
    {
        $b = Api::validate(Api::body($request), ['provider_id' => 'str', 'name' => 'str', 'email' => 'str', 'message' => 'str']);
        if (trim($b['message']) === '') {
            Api::fail(400, 'Message is required');
        }
        $p = Docs::first('provider_profiles', ['provider_id' => $b['provider_id']]);
        if (!$p) {
            Api::fail(404, 'Provider not found');
        }
        $owner = DB::table('users')->where('user_id', $p['user_id'])->first(['email', 'name']);
        $doc = [
            'enquiry_id' => Api::id('enq'),
            'provider_id' => $b['provider_id'],
            'user_id_provider' => $p['user_id'],
            'name' => mb_substr(trim($b['name']), 0, 100),
            'email' => mb_substr(trim($b['email']), 0, 120),
            'message' => mb_substr(trim($b['message']), 0, 1500),
            'read' => false,
            'created_at' => Time::iso(Time::now()),
        ];
        Docs::insert('enquiries', $doc);
        // Notify the advertiser; "reply" in their mail program goes straight to the visitor.
        if ($owner && $owner->email && Mail::enabled()) {
            Mail::send($owner->email, 'New enquiry from '.($doc['name'] ?: 'a visitor'),
                Emails::enquiry($owner->name ?: (($p['display_name'] ?? '') ?: 'there'), $doc),
                $doc['email'] ? ['reply_to' => $doc['email']] : []);
        }
        return Api::json(['ok' => true, 'enquiry_id' => $doc['enquiry_id']]);
    }

    public function mine(Request $request)
    {
        $me = Auth::provider($request);
        $where = ['user_id_provider' => $me['user_id']];
        if ($pid = $request->query('provider_id')) {
            // separate inbox per profile
            if (!Profiles::owned($me, $pid)) {
                Api::fail(404, 'Profile not found');
            }
            $where['provider_id'] = $pid;
        }
        $items = Docs::find('enquiries', $where, 'created_at', 'desc', 200);
        $ids = array_values(array_unique(array_filter(array_column($items, 'provider_id'))));
        $names = [];
        foreach ($ids ? Docs::find('provider_profiles', ['provider_id' => ['in', $ids]]) : [] as $d) {
            $names[$d['provider_id']] = $d['display_name'] ?? '';
        }
        foreach ($items as &$e) {
            $e['created_at'] = Time::iso($e['created_at'] ?? null);
            $e['provider_name'] = $names[$e['provider_id'] ?? ''] ?? '';
        }
        unset($e);
        return Api::json(['enquiries' => $items, 'unread' => count(array_filter($items, fn ($e) => empty($e['read'])))]);
    }

    public function read(Request $request, string $enquiryId)
    {
        $me = Auth::provider($request);
        $b = Api::validate(Api::body($request), ['read' => '?bool'], ['read' => true]);
        if (!Docs::count('enquiries', ['enquiry_id' => $enquiryId, 'user_id_provider' => $me['user_id']])) {
            Api::fail(404, 'Enquiry not found');
        }
        Docs::update('enquiries', ['enquiry_id' => $enquiryId], ['read' => $b['read']]);
        return Api::json(['ok' => true, 'read' => $b['read']]);
    }

    public function destroy(Request $request, string $enquiryId)
    {
        $me = Auth::provider($request);
        if (!Docs::delete('enquiries', ['enquiry_id' => $enquiryId, 'user_id_provider' => $me['user_id']])) {
            Api::fail(404, 'Enquiry not found');
        }
        return Api::json(['ok' => true, 'deleted' => $enquiryId]);
    }

    public function reply(Request $request, string $enquiryId)
    {
        $me = Auth::provider($request);
        $b = Api::validate(Api::body($request), ['message' => 'str']);
        $text = trim($b['message']);
        if (mb_strlen($text) < 2) {
            Api::fail(400, 'Reply is too short');
        }
        $enq = Docs::first('enquiries', ['enquiry_id' => $enquiryId, 'user_id_provider' => $me['user_id']]);
        if (!$enq) {
            Api::fail(404, 'Enquiry not found');
        }
        $to = trim((string) ($enq['email'] ?? ''));
        if ($to === '') {
            Api::fail(400, 'This enquiry has no reply address');
        }
        // Reply-to is the public contact e-mail of the profile, never the private account e-mail.
        $prof = Docs::first('provider_profiles', ['provider_id' => $enq['provider_id'] ?? '']) ?? [];
        $providerName = ($prof['display_name'] ?? '') ?: ($me['name'] ?: 'Elite Escorts Europe');
        $public = trim((string) ($prof['contact']['email'] ?? ''));
        $sent = false;
        if (Mail::enabled()) {
            $sent = Mail::send($to, "Re: Your request to $providerName on Elite Escorts Europe",
                Emails::enquiryReply($enq['name'] ?? '', $providerName, $text), $public ? ['reply_to' => $public] : []);
        }
        Docs::update('enquiries', ['enquiry_id' => $enquiryId], function ($e) use ($text, $me, $sent) {
            $e['replies'] = array_merge($e['replies'] ?? [], [[
                'message' => $text, 'sent_by' => $me['email'], 'sent_at' => Time::iso(Time::now()), 'delivered' => $sent,
            ]]);
            $e['read'] = true;
            return $e;
        });
        return Api::json(['ok' => true, 'delivered' => $sent, 'to' => $to]);
    }

    /** Public: report a profile as fake. Saved for the admins and e-mailed to the site's report address. */
    public function report(Request $request)
    {
        $b = Api::validate(Api::body($request), ['provider_id' => 'str', 'reporter_name' => 'str', 'reporter_email' => 'str', 'description' => 'str', 'images' => '?list'], ['images' => []]);
        if (trim($b['reporter_name']) === '') {
            Api::fail(400, 'Your name is required');
        }
        if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/u', trim($b['reporter_email']))) {
            Api::fail(400, 'A valid email is required');
        }
        if (trim($b['description']) === '') {
            Api::fail(400, 'A description is required');
        }
        $p = Docs::first('provider_profiles', ['provider_id' => $b['provider_id']]);
        if (!$p) {
            Api::fail(404, 'Provider not found');
        }
        $images = array_slice(array_values(array_filter($b['images'], fn ($i) => is_string($i) && $i !== '')), 0, 5);
        $doc = [
            'report_id' => Api::id('rep'),
            'provider_id' => $b['provider_id'],
            'provider_name' => $p['display_name'] ?? null,
            'reporter_name' => trim($b['reporter_name']),
            'reporter_email' => trim($b['reporter_email']),
            'description' => mb_substr(trim($b['description']), 0, 500),
            'images' => $images,
            'status' => 'open',
            'created_at' => Time::iso(Time::now()),
        ];
        Docs::insert('reports', $doc);
        if (Mail::enabled()) {
            $att = [];
            foreach ($images as $i => $img) {
                $content = str_contains($img, ',') ? explode(',', $img, 2)[1] : $img;
                $ext = str_starts_with($img, 'data:image/jpeg') ? 'jpg' : (str_starts_with($img, 'data:image/webp') ? 'webp' : 'png');
                $att[] = ['filename' => 'evidence_'.($i + 1).".$ext", 'content' => $content];
            }
            Mail::send(config('eee.report_email'), 'Profile report: '.($doc['provider_name'] ?: $doc['provider_id']),
                Emails::report($doc), ['reply_to' => $doc['reporter_email'], 'attachments' => $att]);
        }
        return Api::json(['ok' => true, 'report_id' => $doc['report_id']]);
    }
}
