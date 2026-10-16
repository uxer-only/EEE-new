<?php

namespace App\Http\Controllers\Api;

use App\Support\Api;
use App\Support\Auth;
use App\Support\Docs;
use App\Support\Profiles;
use App\Support\Time;
use Illuminate\Http\Request;

/** Advertisers send their ID documents; an admin approves or rejects them. */
class VerificationController
{
    public function submit(Request $request)
    {
        $me = Auth::user($request);
        if ($me['role'] !== 'provider') {
            Api::fail(403, 'Only providers can submit verification');
        }
        $profile = Profiles::owned($me, $request->query('provider_id'));
        if (!$profile) {
            Api::fail(404, 'Provider profile not found');
        }
        $b = Api::validate(Api::body($request), ['id_front' => 'str', 'id_selfie' => 'str', 'secondary_doc' => '?str']);
        $pid = $profile['provider_id'];
        // Earlier pending or rejected documents are replaced (resubmitting after a rejection).
        Docs::delete('verification_documents', ['provider_id' => $pid, 'status' => ['in', ['pending', 'rejected']]]);
        $now = Time::iso(Time::now());
        $docs = [['id_front', $b['id_front']], ['id_selfie', $b['id_selfie']]];
        if ($b['secondary_doc']) {
            $docs[] = ['secondary_doc', $b['secondary_doc']];
        }
        foreach ($docs as [$type, $url]) {
            Docs::insert('verification_documents', [
                'doc_id' => Api::id('doc'), 'provider_id' => $pid, 'document_type' => $type, 'document_url' => $url,
                'status' => 'pending', 'submitted_at' => $now, 'reviewed_at' => null,
            ]);
        }
        Docs::update('provider_profiles', ['provider_id' => $pid], ['verification_status' => 'submitted', 'rejection_reason' => null]);
        return Api::json(['message' => 'Verification submitted', 'document_count' => count($docs)]);
    }

    public function status(Request $request)
    {
        $me = Auth::provider($request);
        $profile = Profiles::owned($me, $request->query('provider_id'));
        if (!$profile) {
            Api::fail(404, 'Profile not found');
        }
        // The document images are not sent back here.
        $docs = array_map(function ($d) {
            unset($d['document_url']);
            return $d;
        }, Docs::find('verification_documents', ['provider_id' => $profile['provider_id']], null, 'asc', 100));
        return Api::json([
            'verification_status' => $profile['verification_status'] ?? 'pending',
            'verified' => (bool) ($profile['verified'] ?? false),
            'rejection_reason' => $profile['rejection_reason'] ?? null,
            'documents' => $docs,
        ]);
    }
}
