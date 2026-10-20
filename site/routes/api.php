<?php

/*
 * The JSON API used by the dashboards, the admin screens and the public pages' forms.
 * All addresses start with /api. The answers have the same shape as the earlier Python backend.
 */

use App\Http\Controllers\Api\AdminController as Admin;
use App\Http\Controllers\Api\AgencyController as Agency;
use App\Http\Controllers\Api\AuthController as AuthC;
use App\Http\Controllers\Api\EnquiryController as Enquiry;
use App\Http\Controllers\Api\MediaController as Media;
use App\Http\Controllers\Api\MiscController as Misc;
use App\Http\Controllers\Api\ProviderController as Provider;
use App\Http\Controllers\Api\SubscriptionController as Sub;
use App\Http\Controllers\Api\VerificationController as Verification;
use App\Support\Api;
use Illuminate\Support\Facades\Route;

// Accounts
Route::post('/auth/register', [AuthC::class, 'register'])->middleware('throttle:account-mail');
Route::post('/auth/login', [AuthC::class, 'login'])->middleware('throttle:login');
Route::get('/auth/me', [AuthC::class, 'me']);
Route::post('/auth/logout', [AuthC::class, 'logout']);
Route::post('/auth/forgot-password', [AuthC::class, 'forgotPassword'])->middleware('throttle:account-mail');
Route::post('/auth/reset-password', [AuthC::class, 'resetPassword'])->middleware('throttle:login');
Route::get('/auth/verify-email', [AuthC::class, 'verifyEmail']);
Route::post('/auth/resend-verification', [AuthC::class, 'resendVerification'])->middleware('throttle:account-mail');

// Profiles and media (specific addresses before /providers/{id})
Route::get('/providers/media/mine', [Media::class, 'mine']);
Route::post('/providers/media', [Media::class, 'upload']);
Route::put('/providers/media/order', [Media::class, 'order']);
Route::delete('/providers/media/{mediaId}', [Media::class, 'destroy']);
Route::get('/media/files/{name}', [Media::class, 'file']);
Route::get('/providers/dashboard/stats', [Provider::class, 'dashboard']);
Route::post('/providers/profile', [Provider::class, 'create']);
Route::put('/providers/profile', [Provider::class, 'update']);
Route::delete('/providers/profile', [Provider::class, 'destroy']);
Route::get('/providers', [Provider::class, 'browse']);
Route::get('/providers/{providerId}', [Provider::class, 'show']);
Route::get('/geo/reverse', [Misc::class, 'reverse']);

// Agencies
Route::get('/agency/profiles', [Agency::class, 'profiles']);
Route::get('/agency/profile', [Agency::class, 'show']);
Route::post('/agency/profile', [Agency::class, 'save']);
Route::delete('/agency/profile', [Agency::class, 'destroy']);
Route::post('/agency/sync-defaults', [Agency::class, 'sync']);
Route::put('/agency/profiles/{providerId}/plan', [Agency::class, 'plan']);

// Plans and payments
Route::post('/subscriptions/checkout', [Sub::class, 'checkout']);
Route::post('/subscriptions/checkout-bulk', [Sub::class, 'bulk']);
Route::get('/subscriptions/status/{sessionId}', [Sub::class, 'status']);
Route::get('/subscriptions/me', [Sub::class, 'me']);
Route::put('/subscriptions/auto-renew', [Sub::class, 'autoRenew']);
Route::post('/webhook/stripe', [Sub::class, 'webhook']);
Route::get('/invoices/mine', [Sub::class, 'invoices']);
Route::get('/invoices/{invoiceId}/pdf', [Sub::class, 'invoicePdf']);

// Requests from visitors, reports
Route::post('/enquiries', [Enquiry::class, 'create']);
Route::get('/enquiries/mine', [Enquiry::class, 'mine']);
Route::put('/enquiries/{enquiryId}/read', [Enquiry::class, 'read']);
Route::delete('/enquiries/{enquiryId}', [Enquiry::class, 'destroy']);
Route::post('/enquiries/{enquiryId}/reply', [Enquiry::class, 'reply']);
Route::post('/reports', [Enquiry::class, 'report']);

// ID verification
Route::post('/verification/submit', [Verification::class, 'submit']);
Route::get('/verification/status', [Verification::class, 'status']);

// Admin
Route::get('/admin/verifications', [Admin::class, 'verifications']);
Route::put('/admin/verifications/{providerId}', [Admin::class, 'decideVerification']);
Route::get('/admin/providers', [Admin::class, 'providers']);
Route::get('/admin/providers/{providerId}', [Admin::class, 'provider']);
Route::post('/admin/providers/{providerId}/verify', [Admin::class, 'verifyProvider']);
Route::post('/admin/providers/{providerId}/publish', [Admin::class, 'publish']);
Route::put('/admin/providers/{providerId}/services/review', [Admin::class, 'service']);
Route::put('/admin/media/{mediaId}/approve', [Admin::class, 'media']);
Route::get('/admin/stats', [Admin::class, 'stats']);
Route::get('/admin/traffic', [Admin::class, 'traffic']);
Route::get('/admin/agencies', [Admin::class, 'agencies']);
Route::get('/admin/agencies/{userId}', [Admin::class, 'agency']);
Route::post('/admin/agencies/{userId}/suspend', [Admin::class, 'suspend']);
Route::delete('/admin/agencies/{userId}', [Admin::class, 'deleteAgency']);

// Visitor counter
Route::post('/track', [Misc::class, 'track']);

// Chat (not used by the current screens)
Route::get('/conversations', [Misc::class, 'conversations']);
Route::post('/conversations', [Misc::class, 'startConversation']);
Route::get('/conversations/{conversationId}/messages', [Misc::class, 'messages']);
Route::post('/messages', [Misc::class, 'send']);

Route::any('/{any}', fn () => Api::json(['detail' => 'Not Found'], 404))->where('any', '.*');
