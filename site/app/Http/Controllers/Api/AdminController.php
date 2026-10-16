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

/** The admin screens: advertisers, media and service review, ID verification, agencies, statistics. */
class AdminController
{
    // ------------------------------------------------------------- verification queue

    public function verifications(Request $request)
    {
        $me = Auth::user($request);
        if ($me['role'] !== 'admin') {
            Api::fail(403, 'Admin access only');
        }
        $status = (string) $request->query('status', 'pending');
        $vs = ['pending' => 'submitted', 'approved' => 'approved', 'rejected' => 'rejected'][$status] ?? 'submitted';
        $out = [];
        foreach (Docs::find('provider_profiles', ['verification_status' => $vs], null, 'asc', 200) as $p) {
            $docs = Docs::find('verification_documents', ['provider_id' => $p['provider_id']], 'submitted_at', 'desc', 100);
            $u = DB::table('users')->where('user_id', $p['user_id'] ?? '')->first(['email', 'name']);
            $owner = Profiles::owner($p['user_id'] ?? null);
            $p['documents'] = $docs;
            $p['user'] = $u ? ['email' => $u->email, 'name' => $u->name] : null;
            $p['owner_type'] = $owner['owner_type'];
            $p['agency_name'] = $owner['agency_name'];
            $p['submitted_at'] = $docs ? Time::iso($docs[0]['submitted_at'] ?? null) : null;
            $out[] = $p;
        }
        usort($out, fn ($a, $b) => strcmp((string) $a['submitted_at'], (string) $b['submitted_at']) * ($vs === 'submitted' ? 1 : -1));
        return Api::json($out);
    }

    public function decideVerification(Request $request, string $providerId)
    {
        $me = Auth::user($request);
        if ($me['role'] !== 'admin') {
            Api::fail(403, 'Admin access only');
        }
        $b = Api::validate(Api::body($request), ['status' => 'str', 'reason' => '?str']);
        if (!in_array($b['status'], ['approved', 'rejected'], true)) {
            Api::fail(400, 'Invalid status');
        }
        $p = Docs::first('provider_profiles', ['provider_id' => $providerId]);
        if (!$p) {
            Api::fail(404, 'Provider not found');
        }
        $approved = $b['status'] === 'approved';
        Docs::update('provider_profiles', ['provider_id' => $providerId], [
            'verification_status' => $b['status'], 'verified' => $approved, 'rejection_reason' => $approved ? null : $b['reason'],
        ]);
        Docs::update('verification_documents', ['provider_id' => $providerId, 'status' => 'pending'], [
            'status' => $b['status'], 'reviewed_at' => Time::iso(Time::now()), 'reviewed_by' => $me['user_id'],
        ]);
        if (Mail::enabled()) {
            $u = DB::table('users')->where('user_id', $p['user_id'] ?? '')->first(['email', 'name']);
            if ($u && $u->email) {
                Mail::send($u->email, $approved ? 'Your Elite Escorts Europe profile is verified' : 'Your Elite Escorts Europe verification update',
                    Emails::verificationDecision($u->name ?: (($p['display_name'] ?? '') ?: 'there'), $approved, $b['reason']));
            }
        }
        return Api::json(['message' => 'Verification '.$b['status']]);
    }

    // ------------------------------------------------------------- advertisers

    public function providers(Request $request)
    {
        Auth::admin($request);
        $now = Time::now();
        $out = [];
        $users = DB::table('users')->get()->keyBy('user_id');
        foreach (Docs::find('provider_profiles', [], null, 'asc', 1000) as $p) {
            $pending = Docs::count('provider_media', ['provider_id' => $p['provider_id'], 'status' => 'pending']);
            $p['pending_media_count'] = $pending;
            $p['pending_services'] = Profiles::pendingCustomServices($p['services'] ?? null);
            $p['needs_action'] = $pending > 0 || (bool) $p['pending_services'];
            $u = $users[$p['user_id']] ?? null;
            $p['user'] = $u ? Auth::shape($u) : null;
            $p['owner_type'] = ($u->account_type ?? null) === 'agency' ? 'agency' : 'independent';
            $p = array_merge($p, Profiles::adminPlan($p, $now));
            unset($p['photos_data']);
            $out[] = $p;
        }
        usort($out, fn ($a, $b) => [!$a['needs_action'], (string) ($a['created_at'] ?? '')] <=> [!$b['needs_action'], (string) ($b['created_at'] ?? '')]);
        return Api::json($out);
    }

    public function provider(Request $request, string $providerId)
    {
        Auth::admin($request);
        $p = Docs::first('provider_profiles', ['provider_id' => $providerId]);
        if (!$p) {
            Api::fail(404, 'Provider not found');
        }
        $u = DB::table('users')->where('user_id', $p['user_id'])->first();
        $p['user'] = $u ? Auth::shape($u) : null;
        $media = Docs::find('provider_media', ['provider_id' => $providerId], 'uploaded_at', 'desc', 100);
        foreach ($media as &$m) {
            if (($m['rejection_reason'] ?? null) === null && !empty($m['reason'])) {
                $m['rejection_reason'] = $m['reason'];
            }
        }
        unset($m);
        $p['media'] = $media;
        $p = array_merge($p, Profiles::adminPlan($p));
        $owner = Profiles::owner($p['user_id']);
        $p['owner_type'] = $owner['owner_type'];
        $p['agency_name'] = $owner['agency_name'];
        $latest = [];
        foreach (Docs::find('verification_documents', ['provider_id' => $providerId], 'submitted_at', 'desc', 20) as $d) {
            $latest[$d['document_type'] ?? ''] ??= $d;  // newest submission per document type
        }
        $p['documents'] = array_values($latest);
        return Api::json($p);
    }

    public function media(Request $request, string $mediaId)
    {
        $me = Auth::admin($request);
        $b = Api::validate(Api::body($request), ['status' => 'str', 'reason' => '?str']);
        $m = Docs::first('provider_media', ['media_id' => $mediaId]);
        if (!$m) {
            Api::fail(404, 'Media not found');
        }
        $set = ['status' => $b['status'], 'reviewed_at' => Time::iso(Time::now()), 'reviewed_by' => $me['user_id']];
        if ($b['reason']) {
            $set['rejection_reason'] = $b['reason'];
        }
        Docs::update('provider_media', ['media_id' => $mediaId], $set);
        $pid = $m['provider_id'];
        if ($b['status'] === 'approved' && ($m['media_type'] ?? 'photo') === 'photo') {
            // Approved photos are published on the profile (approved videos are read from provider_media).
            Docs::update('provider_profiles', ['provider_id' => $pid], function ($p) use ($m) {
                $photos = $p['photos'] ?? [];
                if (!in_array($m['url'], $photos, true)) {
                    $photos[] = $m['url'];
                }
                $p['photos'] = $photos;
                return $p;
            });
        } elseif ($b['status'] === 'rejected') {
            MediaController::pullPhoto($pid, $m['url'] ?? '');
            if (Mail::enabled()) {
                $prof = Docs::first('provider_profiles', ['provider_id' => $pid]) ?? [];
                $owner = DB::table('users')->where('user_id', $prof['user_id'] ?? '')->first(['email', 'name']);
                if ($owner && $owner->email) {
                    $kind = ($m['media_type'] ?? '') === 'video' ? 'video' : 'photo';
                    Mail::send($owner->email, "Your $kind was not approved", Emails::notApproved($owner->name ?? '',
                        "A $kind on the profile ".Emails::strong($prof['display_name'] ?? '').' was not approved.',
                        $b['reason'] ?: 'It did not meet our guidelines.', "You can upload a new $kind from your dashboard."));
                }
            }
        }
        return Api::json(['status' => 'success', 'media_id' => $mediaId, 'new_status' => $b['status']]);
    }

    /** Approve a custom service (it then shows on the profile) or reject it (removed, reason e-mailed). */
    public function service(Request $request, string $providerId)
    {
        $me = Auth::admin($request);
        $b = Api::validate(Api::body($request), ['name' => 'str', 'status' => 'str', 'reason' => '?str']);
        if (!in_array($b['status'], ['approved', 'rejected'], true)) {
            Api::fail(400, 'Invalid status');
        }
        $p = Docs::first('provider_profiles', ['provider_id' => $providerId]);
        $services = $p['services'] ?? null;
        if (!is_array($services) || !is_array($services[$b['name']] ?? null) || empty($services[$b['name']]['custom'])) {
            Api::fail(404, 'Custom service not found');
        }
        $now = Time::iso(Time::now());
        if ($b['status'] === 'approved') {
            $services[$b['name']] = array_replace($services[$b['name']], ['review' => 'approved', 'reviewed_at' => $now]);
            Docs::update('provider_profiles', ['provider_id' => $providerId], ['services' => $services]);
        } else {
            unset($services[$b['name']]);
            Docs::update('provider_profiles', ['provider_id' => $providerId], function ($d) use ($services, $b, $now, $me) {
                $d['services'] = $services;
                $d['rejected_services'] = array_merge($d['rejected_services'] ?? [], [['name' => $b['name'], 'reason' => $b['reason'] ?? '', 'rejected_at' => $now, 'by' => $me['user_id']]]);
                return $d;
            });
            if (Mail::enabled()) {
                $owner = DB::table('users')->where('user_id', $p['user_id'])->first(['email', 'name']);
                if ($owner && $owner->email) {
                    Mail::send($owner->email, 'A service on your profile was not approved', Emails::notApproved($owner->name ?? '',
                        'The service '.Emails::strong($b['name']).' on the profile '.Emails::strong($p['display_name'] ?? '').' was not approved and has been removed.',
                        $b['reason'] ?: 'It does not meet our guidelines.'));
                }
            }
        }
        return Api::json(['status' => 'success', 'name' => $b['name'], 'review' => $b['status']]);
    }

    public function verifyProvider(Request $request, string $providerId)
    {
        Auth::admin($request);
        $verified = (bool) (Api::body($request)['verified'] ?? false);
        if (!Docs::count('provider_profiles', ['provider_id' => $providerId])) {
            Api::fail(404, 'Provider not found');
        }
        Docs::update('provider_profiles', ['provider_id' => $providerId], ['verified' => $verified, 'verification_status' => $verified ? 'approved' : 'pending']);
        return Api::json(['status' => 'success', 'verified' => $verified]);
    }

    // ------------------------------------------------------------- statistics

    public function stats(Request $request)
    {
        Auth::admin($request);
        $profs = Docs::find('provider_profiles');
        $withMedia = array_flip(Docs::distinct('provider_media', 'provider_id', ['status' => 'pending']));
        $withServices = [];
        foreach ($profs as $p) {
            if (Profiles::pendingCustomServices($p['services'] ?? null)) {
                $withServices[$p['provider_id']] = true;
            }
        }
        $ids = array_flip(array_column($profs, 'provider_id'));
        $withMedia = array_intersect_key($withMedia, $ids);
        $agencyUsers = array_flip(DB::table('users')->where('account_type', 'agency')->pluck('user_id')->all());
        $indep = array_filter($profs, fn ($p) => !isset($agencyUsers[$p['user_id']]));
        $comp = array_filter($profs, fn ($p) => isset($agencyUsers[$p['user_id']]));
        $cnt = fn ($list, $fn) => count(array_filter($list, $fn));
        return Api::json([
            'total_providers' => count($profs),
            'total_clients' => DB::table('users')->where('role', 'client')->count(),
            'clients_this_week' => DB::table('users')->where('role', 'client')->where('created_at', '>=', Time::col(Time::now()->subDays(7)))->count(),
            'pending_media' => Docs::count('provider_media', ['status' => 'pending']),
            'pending_services' => count($withServices),
            'providers_needing_action' => count($withMedia + $withServices),
            'verified' => $cnt($profs, fn ($p) => !empty($p['verified'])),
            'not_verified' => $cnt($profs, fn ($p) => empty($p['verified'])),
            'verifications_waiting' => $cnt($profs, fn ($p) => ($p['verification_status'] ?? null) === 'submitted'),
            'verifications_approved' => $cnt($profs, fn ($p) => ($p['verification_status'] ?? null) === 'approved'),
            'verifications_rejected' => $cnt($profs, fn ($p) => ($p['verification_status'] ?? null) === 'rejected'),
            'independents' => [
                'total' => count($indep),
                'media_in_review' => $cnt($indep, fn ($p) => isset($withMedia[$p['provider_id']])),
                'not_verified' => $cnt($indep, fn ($p) => empty($p['verified'])),
            ],
            'agencies' => [
                'total' => Docs::count('agency_profiles'),
                'companions' => count($comp),
                'media_in_review' => $cnt($comp, fn ($p) => isset($withMedia[$p['provider_id']])),
            ],
        ]);
    }

    /** Page views per day, unique visitors per day and the most viewed pages. */
    public function traffic(Request $request)
    {
        Auth::admin($request);
        $days = max(1, min((int) ($request->query('days') ?: 7), 365));
        $start = Time::now()->subDays($days - 1)->format('Y-m-d');
        $rows = [];
        $pages = [];
        $raw = DB::table('traffic_logs')->where('day', '>=', $start)
            ->selectRaw('day, COUNT(*) as views, COUNT(DISTINCT visitor) as visitors')->groupBy('day')->get();
        foreach ($raw as $r) {
            $rows[$r->day] = ['views' => (int) $r->views, 'unique_visitors' => (int) $r->visitors];
        }
        foreach (DB::table('traffic_logs')->where('day', '>=', $start)->selectRaw('page, COUNT(*) as n')->groupBy('page')->get() as $r) {
            $pages[$r->page] = (int) $r->n;
        }
        foreach (DB::table('traffic_daily')->where('day', '>=', $start)->get() as $r) {
            $rows[$r->day] ??= ['views' => 0, 'unique_visitors' => 0];
            $rows[$r->day]['views'] += $r->views;
            $rows[$r->day]['unique_visitors'] += $r->unique_visitors;
            foreach (json_decode($r->pages ?: '{}', true) ?: [] as $k => $v) {
                $pages[$k] = ($pages[$k] ?? 0) + $v;
            }
        }
        ksort($rows);
        $daily = [];
        foreach ($rows as $d => $v) {
            $daily[] = ['date' => $d] + $v;
        }
        arsort($pages);
        return Api::json([
            'period_days' => $days,
            'total_views' => array_sum(array_column($daily, 'views')),
            // visitor codes change every day, so this is the sum of the daily unique visitors
            'total_unique_visitors' => array_sum(array_column($daily, 'unique_visitors')),
            'daily_stats' => $daily,
            'page_stats' => array_slice($pages, 0, 10, true),
        ]);
    }

    // ------------------------------------------------------------- agencies

    public function agencies(Request $request)
    {
        Auth::admin($request);
        $out = [];
        foreach (Docs::find('agency_profiles', [], 'created_at', 'desc', 1000) as $ag) {
            $uid = $ag['user_id'];
            $profiles = Docs::find('provider_profiles', ['user_id' => $uid]);
            $u = DB::table('users')->where('user_id', $uid)->first();
            $out[] = [
                'agency_id' => $ag['agency_id'] ?? null, 'user_id' => $uid,
                'agency_name' => ($ag['agency_name'] ?? '') ?: 'Untitled agency',
                'location' => $ag['location'] ?? [], 'contact' => $ag['contact'] ?? [],
                'suspended' => !empty($ag['suspended']),
                'total_profiles' => count($profiles),
                'live_profiles' => count(array_filter($profiles, fn ($p) => Profiles::isLive($p))),
                'email' => $u->email ?? null, 'name' => $u->name ?? null,
                'created_at' => Time::iso($ag['created_at'] ?? null),
            ];
        }
        return Api::json($out);
    }

    public function agency(Request $request, string $userId)
    {
        Auth::admin($request);
        $ag = Docs::first('agency_profiles', ['user_id' => $userId]);
        if (!$ag) {
            Api::fail(404, 'Agency not found');
        }
        $u = DB::table('users')->where('user_id', $userId)->first();
        $roster = array_map(fn ($p) => [
            'provider_id' => $p['provider_id'],
            'display_name' => ($p['display_name'] ?? '') ?: 'Untitled profile',
            'location' => $p['location'] ?? [], 'age' => $p['age'] ?? null,
            'verified' => (bool) ($p['verified'] ?? false), 'verification_status' => $p['verification_status'] ?? 'pending',
            'suspended' => !empty($p['suspended']), 'live' => Profiles::isLive($p), 'photos' => $p['photos'] ?? [],
        ], Docs::find('provider_profiles', ['user_id' => $userId], 'created_at', 'asc'));
        return Api::json([
            'agency_id' => $ag['agency_id'] ?? null, 'user_id' => $userId,
            'agency_name' => ($ag['agency_name'] ?? '') ?: 'Untitled agency',
            'description' => $ag['description'] ?? null, 'location' => $ag['location'] ?? [], 'contact' => $ag['contact'] ?? [],
            'languages' => $ag['languages'] ?? [], 'suspended' => !empty($ag['suspended']),
            'user' => $u ? Auth::shape($u) : null, 'created_at' => Time::iso($ag['created_at'] ?? null), 'profiles' => $roster,
        ]);
    }

    public function suspend(Request $request, string $userId)
    {
        Auth::admin($request);
        $suspend = (bool) (Api::body($request)['suspend'] ?? true);
        if (!Docs::count('agency_profiles', ['user_id' => $userId])) {
            Api::fail(404, 'Agency not found');
        }
        Docs::update('agency_profiles', ['user_id' => $userId], ['suspended' => $suspend]);
        Docs::update('provider_profiles', ['user_id' => $userId], ['suspended' => $suspend]);
        return Api::json(['status' => 'success', 'suspended' => $suspend]);
    }

    public function deleteAgency(Request $request, string $userId)
    {
        Auth::admin($request);
        if (!Docs::count('agency_profiles', ['user_id' => $userId])) {
            Api::fail(404, 'Agency not found');
        }
        $ids = array_column(Docs::find('provider_profiles', ['user_id' => $userId]), 'provider_id');
        if ($ids) {
            Docs::delete('provider_media', ['provider_id' => ['in', $ids]]);
        }
        Profiles::deleteWithRelated($ids);
        Docs::delete('agency_profiles', ['user_id' => $userId]);
        DB::table('user_sessions')->where('user_id', $userId)->delete();
        DB::table('users')->where('user_id', $userId)->delete();
        return Api::json(['status' => 'success', 'deleted_profiles' => count($ids)]);
    }
}
