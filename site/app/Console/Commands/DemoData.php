<?php

namespace App\Console\Commands;

use App\Support\Api;
use App\Support\Docs;
use App\Support\Time;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/**
 * Fills an EMPTY database with demo accounts and profiles (password for all: demo1234).
 * For local previews only: php artisan eee:demo --fresh
 */
class DemoData extends Command
{
    protected $signature = 'eee:demo {--fresh : Empty the database first}';
    protected $description = 'Fill the database with demo accounts and profiles (never on the live site)';

    private const PW = 'demo1234';

    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('Demo data is never added to the live site (APP_ENV=production).');
            return self::FAILURE;
        }
        if ($this->option('fresh')) {
            Artisan::call('migrate:fresh', ['--force' => true]);
        } elseif (DB::table('users')->exists()) {
            $this->error('The database is not empty. Use --fresh to start over.');
            return self::FAILURE;
        }
        $now = Time::now();
        $photo = fn ($i) => "/demo/p$i.jpg";

        $rates = fn ($in, $out) => [
            'incall' => ['1hour' => (float) $in, '2hours' => $in * 1.7, '3hours' => $in * 2.3, 'overnight' => (float) $in * 6, 'extras' => []],
            'outcall' => ['1hour' => (float) $out, '2hours' => $out * 1.7, '3hours' => $out * 2.3, 'overnight' => (float) $out * 6, 'extras' => []],
        ];
        $services = fn () => [
            'Girlfriend Experience' => ['type' => 'inclusive', 'price' => ''],
            'Dinner Date' => ['type' => 'inclusive', 'price' => ''],
            'Erotic Massage' => ['type' => 'inclusive', 'price' => ''],
            'Overnight Stay' => ['type' => 'extra', 'price' => '1500'],
            'Travel Companion' => ['type' => 'extra', 'price' => '2500'],
        ];
        $chars = fn ($nat, $eth, $hair, $eyes, $h, $w, $langs) => [
            'nationality' => $nat, 'ethnicity' => $eth, 'orientation' => 'Bisexual', 'height' => (string) $h, 'weight' => (string) $w,
            'eye_color' => $eyes, 'hair_color' => $hair, 'hair_length' => 'Long', 'breast_size' => 'C', 'breast_type' => 'Natural',
            'pubic_hair' => 'Trimmed', 'tattoos' => 'None', 'piercings' => 'Ears', 'smoker' => 'No', 'languages' => $langs,
        ];
        $profile = function ($uid, $name, $city, $country, $age, $bio, $idxs, $c, $in, $out, $vip, $days = 20) use ($now, $rates, $services, $photo) {
            return [
                'provider_id' => Api::id('provider'), 'user_id' => $uid, 'display_name' => $name, 'age' => $age, 'gender' => 'female',
                'location' => ['city' => $city, 'country' => $country], 'bio' => $bio, 'essence' => $bio, 'companionshipType' => 'Independent',
                'services' => $services(), 'rates' => $rates($in, $out), 'characteristics' => $c, 'photos' => array_map($photo, $idxs),
                'availability_type' => 'flexible', 'schedule' => [],
                'contact' => ['phone' => '+3312345678', 'email' => strtolower(explode(' ', $name)[0]).'@example.com', 'whatsapp' => '+3312345678', 'telegram' => '', 'website' => ''],
                'verified' => true, 'verification_status' => 'approved', 'available' => true, 'suspended' => false,
                'featured_until' => Time::iso($now->addDays($days)), 'vip_until' => $vip ? Time::iso($now->addDays($days)) : null,
                'status' => 'active', 'created_at' => Time::iso($now),
            ];
        };
        $user = function ($email, $name, $role, $type = null) use ($now) {
            $uid = Api::id('user');
            DB::table('users')->insert([
                'user_id' => $uid, 'email' => $email, 'name' => $name, 'role' => $role, 'account_type' => $type,
                'password_hash' => password_hash(self::PW, PASSWORD_BCRYPT), 'email_verified' => true, 'created_at' => Time::col($now),
            ]);
            return $uid;
        };

        // ---------- 5 independent advertisers ----------
        $indep = [
            ['Isabella Rose', 'London', 'United Kingdom', 26, 'Sophisticated British companion for refined dinners and unforgettable evenings.', [0, 1], ['British', 'European', 'Brunette', 'Green', 172, 57, ['English', 'French']], 300, 400, true],
            ['Chloé Laurent', 'Paris', 'France', 24, 'Elegant Parisian model, fluent in the art of conversation and seduction.', [1, 2], ['French', 'European', 'Brunette', 'Brown', 168, 54, ['French', 'English']], 350, 450, true],
            ['Mia König', 'Berlin', 'Germany', 28, 'Warm, playful and cultured — the perfect companion for the discerning gentleman.', [2, 3], ['German', 'European', 'Blonde', 'Blue', 175, 60, ['German', 'English']], 250, 350, false],
            ['Aria van Dijk', 'Amsterdam', 'Netherlands', 25, 'Adventurous Dutch beauty who loves travel, fine wine and genuine connection.', [4, 5], ['Dutch', 'European', 'Brunette', 'Hazel', 170, 56, ['Dutch', 'English', 'German']], 280, 380, false],
            ['Valentina Cruz', 'Barcelona', 'Spain', 27, 'Passionate Spanish companion with Mediterranean charm and impeccable style.', [5, 7], ['Spanish', 'Latina', 'Black', 'Brown', 166, 55, ['Spanish', 'English']], 300, 400, true],
        ];
        $byName = [];
        foreach ($indep as [$name, $city, $country, $age, $bio, $idxs, $c, $in, $out, $vip]) {
            $uid = $user(mb_strtolower(explode(' ', $name)[0]).'.indep@demo.com', $name, 'provider', 'independent');
            $p = $profile($uid, $name, $city, $country, $age, $bio, $idxs, $chars(...$c), $in, $out, $vip);
            Docs::insert('provider_profiles', $p);
            $byName[$name] = $p;
        }

        // ---------- 2 agencies with companions ----------
        $agencies = [
            ['rosenoire.agency@demo.com', 'Rose Noire', 'Paris', 'France', "Paris' premier boutique agency representing a curated selection of elite companions.", [
                ['Camille', 24, [3], 'French', 'Brunette', 'Brown', 168, 54, 350, 450, true],
                ['Elena', 26, [4], 'Russian', 'Blonde', 'Blue', 174, 58, 400, 500, true],
                ['Nadia', 29, [6], 'Italian', 'Brunette', 'Green', 170, 57, 320, 420, false],
            ]],
            ['viennaelite.agency@demo.com', 'Vienna Elite', 'Vienna', 'Austria', 'An exclusive Viennese agency offering discretion and sophistication for distinguished clients.', [
                ['Lena', 25, [7], 'Austrian', 'Brunette', 'Hazel', 172, 56, 300, 400, true],
                ['Victoria', 27, [0], 'British', 'Brunette', 'Green', 173, 58, 350, 450, false],
            ]],
        ];
        $agencyIds = [];
        foreach ($agencies as [$email, $name, $city, $country, $desc, $companions]) {
            $uid = $user($email, $name, 'provider', 'agency');
            $agencyIds[$name] = $uid;
            Docs::insert('agency_profiles', [
                'user_id' => $uid, 'agency_id' => Api::id('agency'), 'agency_name' => $name,
                'location' => ['city' => $city, 'country' => $country], 'description' => $desc, 'languages' => ['English', 'French'],
                'contact' => ['phone' => '+3312349999', 'email' => $email, 'whatsapp' => '+3312349999', 'telegram' => '', 'website' => ''],
                'default_services' => $services(), 'apply_services_to_all' => true, 'default_rates' => $rates(300, 400),
                'default_availability' => ['availability_type' => 'flexible', 'schedule' => []], 'apply_rates_to_all' => true,
                'onboarded' => true, 'suspended' => false, 'created_at' => Time::iso($now), 'updated_at' => Time::iso($now),
            ]);
            foreach ($companions as [$cn, $age, $idxs, $nat, $hair, $eyes, $h, $w, $in, $out, $vip]) {
                $p = $profile($uid, $cn, $city, $country, $age, "$cn — a signature companion of $name.", $idxs,
                    $chars($nat, 'European', $hair, $eyes, $h, $w, ['English', 'French']), $in, $out, $vip);
                $p['companionshipType'] = 'Agency';
                Docs::insert('provider_profiles', $p);
            }
        }

        $user('admin@demo.com', 'Admin', 'admin');
        $user('client@demo.com', 'Marcus', 'client');
        $user('new.indep@demo.com', 'Mila', 'provider', 'independent');
        $user('new.agency@demo.com', 'New Agency', 'provider', 'agency');

        // Rose Noire: one plan ended two days ago, and one draft companion
        $rose = Docs::find('provider_profiles', ['user_id' => $agencyIds['Rose Noire']], 'id');
        if (count($rose) >= 3) {
            Docs::update('provider_profiles', ['provider_id' => $rose[2]['provider_id']], ['featured_until' => Time::iso($now->subDays(2)), 'vip_until' => null]);
        }
        Docs::insert('provider_profiles', [
            'provider_id' => Api::id('provider'), 'user_id' => $agencyIds['Rose Noire'], 'display_name' => 'Noor', 'age' => 23, 'gender' => 'female',
            'location' => ['city' => 'Paris', 'country' => 'France'], 'bio' => '', 'photos' => [], 'companionshipType' => 'Agency',
            'verified' => false, 'verification_status' => 'pending', 'created_at' => Time::iso($now),
        ]);

        // Chloé: a video, more photos, a schedule and contact apps (profile page demo)
        $chloe = $byName['Chloé Laurent'];
        Docs::insert('provider_media', ['media_id' => 'media_demo_v1', 'provider_id' => $chloe['provider_id'], 'url' => '/demo/v1.mp4', 'media_type' => 'video', 'status' => 'approved', 'uploaded_at' => Time::iso($now)]);
        Docs::update('provider_profiles', ['provider_id' => $chloe['provider_id']], function ($p) use ($photo) {
            $p['photos'] = array_map($photo, [1, 2, 4, 5, 6]);
            $p['booking_advance'] = true;
            $p['worldwide_travel'] = true;
            $p['availability_type'] = 'both';
            $p['schedule'] = [];
            foreach (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as $d) {
                $p['schedule'][$d] = $d !== 'sunday' ? ['available' => true, 'start' => '18:00', 'end' => '02:00'] : ['available' => false];
            }
            $p['contact'] += ['hasSms' => true, 'hasTelegram' => true, 'hasSignal' => true, 'hasViber' => true];
            $p['contact']['telegram'] = '@chloe';
            $p['rates']['outcall']['taxi'] = 40;
            return $p;
        });

        // Isabella's inbox
        $isa = $byName['Isabella Rose'];
        foreach ([
            ['Marcus', 'marcus.v@gmail.com', 0.05, false, null, "Hello,\n\nI found your profile on Elite Escorts Europe. Are you available for a dinner date next Thursday around 8 pm? I would book a restaurant in the city centre.\n\nKind regards,\nMarcus"],
            ['Thomas', 'thomas.l@outlook.com', 1, false, null, 'Hi, I will be in town from 17 to 19 October. Would a weekend booking be possible? Let me know your rate for two nights.'],
            ['David', 'd.peeters@telenet.be', 4, true, 'Good morning David, yes, I regularly accompany clients to business events. Could you tell me the location and the times?', 'Good morning, I am looking for a companion for a business reception on 24 October. Dress code is formal. Is this something you do?'],
            ['Anna', 'anna.k@proton.me', 12, true, null, 'Hello, do you also offer outcall? And is there a travel fee?'],
        ] as [$n, $m, $days, $read, $reply, $text]) {
            $doc = ['enquiry_id' => Api::id('enq'), 'provider_id' => $isa['provider_id'], 'user_id_provider' => $isa['user_id'], 'name' => $n, 'email' => $m,
                'message' => $text, 'read' => $read, 'created_at' => Time::iso($now->subMinutes((int) ($days * 1440)))];
            if ($reply) {
                $doc['replies'] = [['message' => $reply, 'sent_by' => 'isabella.indep@demo.com', 'sent_at' => Time::iso($now->subMinutes((int) (($days - 0.1) * 1440))), 'delivered' => true]];
            }
            Docs::insert('enquiries', $doc);
        }

        // Admin: a verification queue, media and custom services to review
        $mia = $byName['Mia König'];
        $noor = Docs::first('provider_profiles', ['user_id' => $agencyIds['Rose Noire'], 'verified' => 0]);
        foreach ([[$mia, 3, 60 * 30], [$noor, 2, 60 * 6]] as [$p, $n, $mins]) {
            if (!$p) {
                continue;
            }
            Docs::update('provider_profiles', ['provider_id' => $p['provider_id']], ['verified' => false, 'verification_status' => 'submitted']);
            foreach (array_slice(['id_front', 'id_selfie', 'secondary_doc'], 0, $n) as $k => $t) {
                Docs::insert('verification_documents', ['doc_id' => Api::id('doc'), 'provider_id' => $p['provider_id'], 'document_type' => $t,
                    'document_url' => $photo($k + 3), 'status' => 'pending', 'submitted_at' => Time::iso($now->subMinutes($mins)), 'reviewed_at' => null]);
            }
        }
        Docs::update('provider_profiles', ['provider_id' => $mia['provider_id']], function ($p) {
            $p['services']['Dinner date'] = ['type' => 'extra', 'price' => '150', 'custom' => true, 'review' => 'pending'];
            $p['services']['Ballroom dancing'] = ['type' => 'inclusive', 'price' => '', 'custom' => true, 'review' => 'pending'];
            return $p;
        });
        foreach ([['photo', $photo(6), 'pending', 0.1], ['photo', $photo(7), 'pending', 0.2], ['video', '/demo/v1.mp4', 'pending', 0.6], ['photo', $photo(0), 'rejected', 4]] as $k => [$t, $u, $st, $ago]) {
            $doc = ['media_id' => "media_admin_$k", 'provider_id' => $mia['provider_id'], 'url' => $u, 'media_type' => $t, 'status' => $st,
                'uploaded_at' => Time::iso($now->subMinutes((int) ($ago * 1440))), 'file_name' => basename($u)];
            if ($st === 'rejected') {
                $doc += ['rejection_reason' => 'Face is fully visible — please crop or blur and upload again.', 'reviewed_at' => Time::iso($now->subDays(3))];
            }
            Docs::insert('provider_media', $doc);
        }
        foreach ($mia['photos'] as $k => $u) {
            Docs::insert('provider_media', ['media_id' => "media_ok_$k", 'provider_id' => $mia['provider_id'], 'url' => $u, 'media_type' => 'photo', 'status' => 'approved', 'uploaded_at' => Time::iso($now->subDays(10))]);
        }

        // 30 days of page views
        mt_srand(7);
        $pages = array_merge(array_fill(0, 30, '/'), array_fill(0, 25, '/browse'), array_fill(0, 12, '/browse?city=Paris'),
            array_fill(0, 8, '/advertising-prices'), array_fill(0, 4, '/contact'), array_fill(0, 3, '/terms'));
        $rows = [];
        for ($d = 0; $d < 30; $d++) {
            for ($i = 0, $n = mt_rand(25, 60); $i < $n; $i++) {
                $ts = $now->subDays($d)->subMinutes(mt_rand(0, 1400));
                $rows[] = ['page' => $pages[mt_rand(0, count($pages) - 1)], 'day' => $ts->format('Y-m-d'), 'visitor' => 'v'.mt_rand(1, 160), 'timestamp' => Time::col($ts)];
            }
        }
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('traffic_logs')->insert($chunk);
        }

        $this->info('Demo data added. All passwords: '.self::PW);
        $this->line('  Independent: isabella.indep@demo.com, chloé.indep@demo.com, mia.indep@demo.com, new.indep@demo.com');
        $this->line('  Agency: rosenoire.agency@demo.com, new.agency@demo.com · Admin: admin@demo.com (/admin/login)');
        return self::SUCCESS;
    }
}
