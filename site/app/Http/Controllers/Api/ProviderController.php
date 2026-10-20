<?php

namespace App\Http\Controllers\Api;

use App\Support\Api;
use App\Support\Auth;
use App\Support\Browse;
use App\Support\Docs;
use App\Support\Profiles;
use App\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Advertiser profiles: Browse, the public profile, and creating / editing / deleting one's own profile. */
class ProviderController
{
    /** Fields of a profile and their types (see Api::validate). */
    private const FIELDS = [
        'display_name' => 'str', 'account_type' => '?str', 'availability_type' => '?str', 'booking_advance' => '?bool',
        'available247' => '?bool', 'worldwide_travel' => '?bool', 'age' => '?int', 'gender' => '?str', 'location' => 'dict',
        'bio' => '?str', 'essence' => '?str', 'companionshipType' => '?str', 'services' => '?any', 'rates' => '?dict',
        'contact' => '?dict', 'schedule' => '?dict', 'photos' => '?strlist', 'characteristics' => '?dict', 'accepts_disabilities' => '?bool',
    ];
    private const CREATE_DEFAULTS = [
        'account_type' => 'independent', 'availability_type' => 'both', 'booking_advance' => false, 'available247' => false,
        'worldwide_travel' => false, 'services' => [], 'rates' => [], 'photos' => [], 'accepts_disabilities' => false,
    ];

    public function browse(Request $request)
    {
        return Api::json(Browse::search($request->query(), $request));
    }

    public function show(string $providerId)
    {
        $p = Browse::profile($providerId);
        if (!$p) {
            Api::fail(404, 'Provider not found');
        }
        return Api::json($p);
    }

    public function create(Request $request)
    {
        $me = Auth::user($request);
        $admin = $me['role'] === 'admin';
        if (!$admin && $me['role'] !== 'provider') {
            Api::fail(403, 'Only providers can create profiles');
        }
        // Independent advertisers have one profile; agencies may create many.
        if (!$admin && Docs::first('provider_profiles', ['user_id' => $me['user_id']]) && $me['account_type'] !== 'agency') {
            Api::fail(400, 'Profile already exists');
        }
        $data = Api::validate(Api::body($request), self::FIELDS, self::CREATE_DEFAULTS);
        $data['photos'] = [];  // photos are added through upload + review
        $data['rates'] = Profiles::normalizeRates($data['rates']);
        $data['services'] = Profiles::applyServiceReview($data['services'], null);
        $providerId = Api::id('provider');
        $userId = $me['user_id'];
        if ($admin) {
            // A profile the admin adds himself: it gets its own advertiser account without a password or real
            // e-mail address (nobody can log in to it, no e-mails go out). Later it can be handed over to the
            // advertiser by giving that account their address.
            $data['account_type'] = 'independent';
            $data['services'] = Profiles::approveServices($data['services']);
            $userId = Api::id('user');
            DB::table('users')->insert([
                'user_id' => $userId,
                'email' => $providerId.'@'.Profiles::MANAGED_DOMAIN,
                'name' => mb_substr(trim($data['display_name']), 0, 190),
                'picture' => null,
                'role' => 'provider',
                'account_type' => 'independent',
                'password_hash' => null,
                'email_verified' => true,
                'created_at' => Time::col(Time::now()),
            ]);
        }
        Docs::insert('provider_profiles', array_merge(['provider_id' => $providerId, 'user_id' => $userId], $data, [
            'verified' => false, 'verification_status' => 'pending', 'available' => true, 'created_at' => Time::iso(Time::now()),
        ]));
        return Api::json(['provider_id' => $providerId, 'message' => 'Profile created successfully']);
    }

    public function update(Request $request)
    {
        $me = Auth::user($request);
        if (!in_array($me['role'], ['provider', 'admin'], true)) {
            Api::fail(403, 'Only providers can update profiles');
        }
        $profile = Profiles::editable($me, $request->query('provider_id'));
        if (!$profile) {
            Api::fail(404, 'Profile not found');
        }
        $schema = array_map(fn ($t) => '?'.ltrim($t, '?'), self::FIELDS) + ['available' => '?bool'];
        $upd = array_filter(Api::validate(Api::body($request), $schema), fn ($v) => $v !== null);
        // Photos are only published through upload + admin review, never set directly.
        unset($upd['photos']);
        if (array_key_exists('rates', $upd)) {
            $upd['rates'] = Profiles::normalizeRates($upd['rates']);
        }
        if (array_key_exists('services', $upd)) {
            $upd['services'] = Profiles::applyServiceReview($upd['services'], $profile['services'] ?? null);
            if ($me['role'] === 'admin') {
                $upd['services'] = Profiles::approveServices($upd['services']);
            }
        }
        if ($upd) {
            Docs::update('provider_profiles', ['provider_id' => $profile['provider_id']], $upd);
        }
        return Api::json(['message' => 'Profile updated successfully']);
    }

    public function destroy(Request $request)
    {
        $me = Auth::user($request);
        if (!in_array($me['role'], ['provider', 'admin'], true)) {
            Api::fail(403, 'Only providers can delete profiles');
        }
        $profile = Profiles::editable($me, $request->query('provider_id'));
        if (!$profile) {
            Api::fail(404, 'Profile not found');
        }
        Profiles::deleteWithRelated([$profile['provider_id']]);
        // The account behind a profile the admin added goes with it.
        $owner = DB::table('users')->where('user_id', $profile['user_id'])->first(['email']);
        if ($me['role'] === 'admin' && $owner && Profiles::isManaged($owner->email)) {
            DB::table('users')->where('user_id', $profile['user_id'])->delete();
        }
        return Api::json(['message' => 'Profile deleted successfully']);
    }

    public function dashboard(Request $request)
    {
        $me = Auth::provider($request);
        $profile = Profiles::owned($me, $request->query('provider_id'));
        if (!$profile) {
            return Api::json(['profile' => null, 'stats' => []]);
        }
        unset($profile['created_at']);
        $unread = 0;
        foreach (Docs::find('conversations', ['provider_id' => $profile['provider_id']], null, 'asc', 100) as $c) {
            $unread += Docs::count('messages', ['conversation_id' => $c['conversation_id'], 'sender_id' => ['!=', $me['user_id']], 'read' => 0]);
        }
        return Api::json(['profile' => $profile, 'stats' => ['unread_messages' => $unread]]);
    }
}
