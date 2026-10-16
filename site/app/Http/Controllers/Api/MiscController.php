<?php

namespace App\Http\Controllers\Api;

use App\Support\Api;
use App\Support\Auth;
use App\Support\Docs;
use App\Support\Geo;
use App\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Small endpoints: the page-view counter, the city name for "close to me", and the older chat feature. */
class MiscController
{
    /**
     * Count one page view. No cookies and no IP address are stored: only a scrambled visitor code
     * that changes every day, so a visitor can't be followed from one day to the next.
     */
    public function track(Request $request)
    {
        $body = json_decode($request->getContent() ?: '{}', true) ?: [];
        $page = mb_substr((string) ($body['page'] ?? '/'), 0, 200) ?: '/';
        if (!str_starts_with($page, '/') || str_starts_with($page, '/admin')) {
            return Api::json(['status' => 'ignored']);
        }
        $now = Time::now();
        $day = $now->format('Y-m-d');
        $ip = trim(explode(',', (string) $request->header('x-forwarded-for'))[0]) ?: (string) $request->server('REMOTE_ADDR');
        DB::table('traffic_logs')->insert([
            'page' => $page,
            'day' => $day,
            'visitor' => substr(hash('sha256', config('eee.visitor_salt')."|$day|$ip"), 0, 20),
            'timestamp' => Time::col($now),
        ]);
        return Api::json(['status' => 'tracked']);
    }

    public function reverse(Request $request)
    {
        $b = Api::validate($request->query(), ['lat' => 'float', 'lng' => 'float']);
        return Api::json(['city' => Geo::reverse($b['lat'], $b['lng'])]);
    }

    // ---------------------------------------------------------------- chat (not used by the current screens)

    public function conversations(Request $request)
    {
        $me = Auth::user($request);
        if ($me['role'] === 'client') {
            $where = ['client_id' => $me['user_id']];
        } elseif ($me['role'] === 'provider') {
            $p = Docs::first('provider_profiles', ['user_id' => $me['user_id']]);
            if (!$p) {
                return Api::json([]);
            }
            $where = ['provider_id' => $p['provider_id']];
        } else {
            $where = [];
        }
        $out = [];
        foreach (Docs::find('conversations', $where, 'last_message_at', 'desc', 100) as $c) {
            $cl = DB::table('users')->where('user_id', $c['client_id'])->first(['name', 'picture']);
            $pr = Docs::first('provider_profiles', ['provider_id' => $c['provider_id']]);
            $c['client'] = $cl ? ['name' => $cl->name, 'picture' => $cl->picture] : null;
            $c['provider'] = $pr ? ['display_name' => $pr['display_name'] ?? null, 'photos' => $pr['photos'] ?? [], 'user_id' => $pr['user_id']] : null;
            $c['unread_count'] = Docs::count('messages', ['conversation_id' => $c['conversation_id'], 'sender_id' => ['!=', $me['user_id']], 'read' => 0]);
            $out[] = $c;
        }
        return Api::json($out);
    }

    public function messages(Request $request, string $conversationId)
    {
        $me = Auth::user($request);
        $c = Docs::first('conversations', ['conversation_id' => $conversationId]);
        if (!$c) {
            Api::fail(404, 'Conversation not found');
        }
        if ($me['role'] === 'client' && $c['client_id'] !== $me['user_id']) {
            Api::fail(403, 'Not authorized');
        }
        if ($me['role'] === 'provider') {
            $p = Docs::first('provider_profiles', ['user_id' => $me['user_id']]);
            if (!$p || $c['provider_id'] !== $p['provider_id']) {
                Api::fail(403, 'Not authorized');
            }
        }
        $msgs = Docs::find('messages', ['conversation_id' => $conversationId], 'timestamp', 'asc', 1000);
        Docs::update('messages', ['conversation_id' => $conversationId, 'sender_id' => ['!=', $me['user_id']], 'read' => 0], ['read' => true]);
        return Api::json($msgs);
    }

    public function send(Request $request)
    {
        $me = Auth::user($request);
        $b = Api::validate(Api::body($request), ['conversation_id' => 'str', 'content' => 'str']);
        if (!Docs::count('conversations', ['conversation_id' => $b['conversation_id']])) {
            Api::fail(404, 'Conversation not found');
        }
        $id = Api::id('msg');
        $now = Time::iso(Time::now());
        Docs::insert('messages', ['message_id' => $id, 'conversation_id' => $b['conversation_id'], 'sender_id' => $me['user_id'], 'content' => $b['content'], 'timestamp' => $now, 'read' => false]);
        Docs::update('conversations', ['conversation_id' => $b['conversation_id']], ['last_message' => $b['content'], 'last_message_at' => $now]);
        return Api::json(['message_id' => $id]);
    }

    public function startConversation(Request $request)
    {
        $me = Auth::user($request);
        if ($me['role'] !== 'client') {
            Api::fail(403, 'Only clients can start conversations');
        }
        $pid = (string) $request->query('provider_id', '');
        $ex = Docs::first('conversations', ['client_id' => $me['user_id'], 'provider_id' => $pid]);
        if ($ex) {
            return Api::json(['conversation_id' => $ex['conversation_id']]);
        }
        $id = Api::id('conv');
        Docs::insert('conversations', ['conversation_id' => $id, 'client_id' => $me['user_id'], 'provider_id' => $pid, 'last_message' => null, 'last_message_at' => null, 'created_at' => Time::iso(Time::now())]);
        return Api::json(['conversation_id' => $id]);
    }
}
