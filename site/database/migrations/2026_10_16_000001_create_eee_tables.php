<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * All tables of the site.
 *
 * Profiles, media, enquiries, payments and similar records keep their full content in a `doc`
 * column (JSON text), the same shape the dashboards and admin screens expect. The other columns
 * are copies of the fields the site searches on, kept in sync by App\Support\Docs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $t) {
            $t->id();
            $t->string('user_id', 40)->unique();
            $t->string('email', 190)->unique();
            $t->string('name', 190)->default('');
            $t->string('picture', 500)->nullable();
            $t->string('role', 20);                      // provider | client | admin
            $t->string('account_type', 20)->nullable();  // independent | agency (providers only)
            $t->string('password_hash', 255)->nullable();
            $t->boolean('email_verified')->default(false);
            $t->dateTime('created_at')->nullable();
        });

        Schema::create('user_sessions', function (Blueprint $t) {
            $t->id();
            $t->string('session_token', 80)->unique();
            $t->string('user_id', 40)->index();
            $t->dateTime('expires_at');
            $t->dateTime('created_at')->nullable();
        });

        foreach (['password_reset_tokens', 'email_verification_tokens'] as $name) {
            Schema::create($name, function (Blueprint $t) {
                $t->id();
                $t->string('token', 100)->unique();
                $t->string('user_id', 40)->index();
                $t->string('email', 190);
                $t->dateTime('expires_at');
                $t->boolean('used')->default(false);
                $t->dateTime('used_at')->nullable();
                $t->dateTime('created_at')->nullable();
            });
        }

        // ---------- records stored as documents ----------
        Schema::create('provider_profiles', function (Blueprint $t) {
            $t->id();
            $t->string('provider_id', 40)->unique();
            $t->string('user_id', 40)->index();
            $t->boolean('verified')->default(false);
            $t->boolean('available')->default(true);
            $t->boolean('suspended')->default(false);
            $t->string('verification_status', 20)->nullable()->index();
            $t->dateTime('featured_until')->nullable()->index();
            $t->dateTime('vip_until')->nullable();
            $t->dateTime('created_at')->nullable();
            $t->longText('doc');
        });

        Schema::create('agency_profiles', function (Blueprint $t) {
            $t->id();
            $t->string('user_id', 40)->unique();
            $t->string('agency_id', 40)->nullable();
            $t->dateTime('created_at')->nullable();
            $t->longText('doc');
        });

        Schema::create('provider_media', function (Blueprint $t) {
            $t->id();
            $t->string('media_id', 40)->unique();
            $t->string('provider_id', 40)->index();
            $t->string('status', 20)->index();
            $t->string('media_type', 10);
            $t->dateTime('uploaded_at')->nullable();
            $t->longText('doc');
        });

        Schema::create('enquiries', function (Blueprint $t) {
            $t->id();
            $t->string('enquiry_id', 40)->unique();
            $t->string('provider_id', 40)->index();
            $t->string('user_id_provider', 40)->index();
            $t->boolean('read')->default(false);
            $t->dateTime('created_at')->nullable();
            $t->longText('doc');
        });

        Schema::create('reports', function (Blueprint $t) {
            $t->id();
            $t->string('report_id', 40)->unique();
            $t->string('provider_id', 40)->index();
            $t->dateTime('created_at')->nullable();
            $t->longText('doc');
        });

        Schema::create('payment_transactions', function (Blueprint $t) {
            $t->id();
            $t->string('session_id', 255)->unique();
            $t->string('user_id', 40)->index();
            $t->string('provider_id', 40)->nullable()->index();
            $t->string('payment_status', 20)->nullable();
            $t->string('status', 20)->nullable();
            $t->dateTime('created_at')->nullable();
            $t->longText('doc');
        });

        Schema::create('subscriptions', function (Blueprint $t) {
            $t->id();
            $t->string('provider_id', 40)->index();
            $t->dateTime('created_at')->nullable();
            $t->longText('doc');
        });

        Schema::create('verification_documents', function (Blueprint $t) {
            $t->id();
            $t->string('doc_id', 40)->unique();
            $t->string('provider_id', 40)->index();
            $t->string('status', 20);
            $t->string('document_type', 30);
            $t->dateTime('submitted_at')->nullable();
            $t->longText('doc');   // the document images are kept here as base64, as before
        });

        Schema::create('conversations', function (Blueprint $t) {
            $t->id();
            $t->string('conversation_id', 40)->unique();
            $t->string('client_id', 40)->index();
            $t->string('provider_id', 40)->index();
            $t->dateTime('last_message_at')->nullable();
            $t->longText('doc');
        });

        Schema::create('messages', function (Blueprint $t) {
            $t->id();
            $t->string('message_id', 40)->unique();
            $t->string('conversation_id', 40)->index();
            $t->string('sender_id', 40);
            $t->boolean('read')->default(false);
            $t->dateTime('timestamp')->nullable();
            $t->longText('doc');
        });

        // ---------- visitor counter (no IP addresses: only a code that changes every day) ----------
        Schema::create('traffic_logs', function (Blueprint $t) {
            $t->id();
            $t->string('page', 200);
            $t->string('day', 10)->index();
            $t->string('visitor', 20)->nullable();
            $t->dateTime('timestamp');
        });

        Schema::create('traffic_daily', function (Blueprint $t) {
            $t->id();
            $t->string('day', 10)->unique();
            $t->unsignedInteger('views')->default(0);
            $t->unsignedInteger('unique_visitors')->default(0);
            $t->longText('pages')->nullable();  // JSON {page: views}
        });

        // ---------- caches for "nearest first" sorting ----------
        Schema::create('geocode_cache', function (Blueprint $t) {
            $t->id();
            $t->string('cache_key', 255)->unique();
            $t->double('lat')->nullable();
            $t->double('lng')->nullable();
            $t->string('city', 190)->nullable();
        });

        Schema::create('ip_geo_cache', function (Blueprint $t) {
            $t->id();
            $t->string('ip', 64)->unique();
            $t->double('lat')->nullable();
            $t->double('lng')->nullable();
            $t->unsignedBigInteger('expires_at');
        });
    }

    public function down(): void
    {
        foreach (['ip_geo_cache', 'geocode_cache', 'traffic_daily', 'traffic_logs', 'messages', 'conversations',
            'verification_documents', 'subscriptions', 'payment_transactions', 'reports', 'enquiries',
            'provider_media', 'agency_profiles', 'provider_profiles', 'email_verification_tokens',
            'password_reset_tokens', 'user_sessions', 'users'] as $name) {
            Schema::dropIfExists($name);
        }
    }
};
