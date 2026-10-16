<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Small document store on top of the database.
 *
 * Each record is a PHP array (the "document") saved as JSON in the `doc` column. The columns
 * listed in COLUMNS are copied from the document on every save, so the site can search on them.
 *
 * Conditions ($where) use those columns: ['provider_id' => 'x'] for equality, or
 * ['status' => ['in', ['a', 'b']]], ['featured_until' => ['>', $time]], ['x' => ['!=', null]] …
 */
class Docs
{
    /** Searchable columns per table. Date columns end in _at / _until / timestamp. */
    public const COLUMNS = [
        'provider_profiles' => ['provider_id', 'user_id', 'verified', 'available', 'suspended', 'verification_status', 'featured_until', 'vip_until', 'created_at'],
        'agency_profiles' => ['user_id', 'agency_id', 'created_at'],
        'provider_media' => ['media_id', 'provider_id', 'status', 'media_type', 'uploaded_at'],
        'enquiries' => ['enquiry_id', 'provider_id', 'user_id_provider', 'read', 'created_at'],
        'reports' => ['report_id', 'provider_id', 'created_at'],
        'payment_transactions' => ['session_id', 'user_id', 'provider_id', 'payment_status', 'status', 'created_at'],
        'subscriptions' => ['provider_id', 'created_at'],
        'verification_documents' => ['doc_id', 'provider_id', 'status', 'document_type', 'submitted_at'],
        'conversations' => ['conversation_id', 'client_id', 'provider_id', 'last_message_at'],
        'messages' => ['message_id', 'conversation_id', 'sender_id', 'read', 'timestamp'],
    ];

    /** Defaults for columns when the document doesn't have the field. */
    private const DEFAULTS = ['verified' => false, 'available' => true, 'suspended' => false, 'read' => false];

    /** @return array<int, array> documents */
    public static function find(string $table, array $where = [], ?string $order = null, string $dir = 'asc', ?int $limit = null): array
    {
        $q = self::query($table, $where);
        if ($order) {
            $q->orderBy($order, $dir);
        }
        $q->orderBy('id', $dir);
        if ($limit) {
            $q->limit($limit);
        }
        return $q->get(['id', 'doc'])->map(fn ($r) => self::decode($r->doc))->all();
    }

    public static function first(string $table, array $where, ?string $order = null, string $dir = 'asc'): ?array
    {
        return self::find($table, $where, $order, $dir, 1)[0] ?? null;
    }

    public static function count(string $table, array $where = []): int
    {
        return self::query($table, $where)->count();
    }

    public static function insert(string $table, array $doc): array
    {
        DB::table($table)->insert(self::row($table, $doc));
        return $doc;
    }

    /**
     * Change every matching document. $patch is either an array of fields to set (like Mongo $set)
     * or a function that receives the document and returns the changed document.
     * Returns the number of documents changed.
     */
    public static function update(string $table, array $where, array|callable $patch): int
    {
        $rows = self::query($table, $where)->get(['id', 'doc']);
        $n = 0;
        foreach ($rows as $r) {
            $doc = self::decode($r->doc);
            $new = is_callable($patch) ? $patch($doc) : array_replace($doc, $patch);
            if ($new !== $doc) {
                DB::table($table)->where('id', $r->id)->update(self::row($table, $new));
                $n++;
            }
        }
        return $n;
    }

    /** Change only the first matching document (by $order). Returns true when one was found. */
    public static function updateFirst(string $table, array $where, array $set, ?string $order = null, string $dir = 'asc'): bool
    {
        $q = self::query($table, $where);
        if ($order) {
            $q->orderBy($order, $dir);
        }
        $r = $q->orderBy('id', $dir)->first(['id', 'doc']);
        if (!$r) {
            return false;
        }
        DB::table($table)->where('id', $r->id)->update(self::row($table, array_replace(self::decode($r->doc), $set)));
        return true;
    }

    /** Update the first match, or insert $insert (merged with the patch) when nothing matches. */
    public static function upsert(string $table, array $where, array $set, array $insert = []): void
    {
        if (self::query($table, $where)->exists()) {
            self::update($table, $where, $set);
        } else {
            $plain = [];
            foreach ($where as $k => $v) {
                if (!is_array($v)) {
                    $plain[$k] = $v;
                }
            }
            self::insert($table, array_replace($plain, $insert, $set));
        }
    }

    public static function delete(string $table, array $where): int
    {
        return self::query($table, $where)->delete();
    }

    /** Distinct values of one column for the matching rows. */
    public static function distinct(string $table, string $column, array $where = []): array
    {
        return self::query($table, $where)->distinct()->pluck($column)->all();
    }

    // ------------------------------------------------------------------ internals

    public static function query(string $table, array $where)
    {
        $q = DB::table($table);
        foreach ($where as $col => $cond) {
            if (!in_array($col, self::COLUMNS[$table], true)) {
                throw new \InvalidArgumentException("$table.$col is not searchable");
            }
            $isDate = self::isDate($col);
            if (is_array($cond)) {
                [$op, $val] = $cond;
                if ($op === 'in') {
                    $q->whereIn($col, array_values($val));
                } elseif ($op === 'not in') {
                    $q->whereNotIn($col, array_values($val));
                } elseif ($val === null) {
                    $op === '!=' ? $q->whereNotNull($col) : $q->whereNull($col);
                } else {
                    $q->where($col, $op, $isDate ? Time::col($val) : $val);
                }
            } elseif ($cond === null) {
                $q->whereNull($col);
            } else {
                $q->where($col, $isDate ? Time::col($cond) : $cond);
            }
        }
        return $q;
    }

    private static function isDate(string $col): bool
    {
        return str_ends_with($col, '_at') || str_ends_with($col, '_until') || $col === 'timestamp';
    }

    private static function row(string $table, array $doc): array
    {
        $row = ['doc' => json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION)];
        foreach (self::COLUMNS[$table] as $col) {
            $v = array_key_exists($col, $doc) ? $doc[$col] : (self::DEFAULTS[$col] ?? null);
            if (self::isDate($col)) {
                $v = Time::col($v);
            } elseif (is_bool($v)) {
                $v = $v ? 1 : 0;
            } elseif (is_array($v)) {
                $v = null;
            }
            if ($v === null && array_key_exists($col, self::DEFAULTS)) {
                $v = self::DEFAULTS[$col] ? 1 : 0;
            }
            $row[$col] = $v;
        }
        return $row;
    }

    private static function decode(string $json): array
    {
        $d = json_decode($json, true);
        return is_array($d) ? $d : [];
    }
}
