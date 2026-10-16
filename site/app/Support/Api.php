<?php

namespace App\Support;

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Helpers for the JSON API (/api/...). Answers and error messages have the same shape as the
 * earlier Python backend, so the dashboards and admin screens work unchanged:
 * errors are {"detail": "..."}; invalid input is a 422 with a list of field problems.
 */
class Api
{
    /** Fields that are JSON objects ({}), even when empty. PHP can't tell [] and {} apart. */
    private const OBJECT_KEYS = [
        'services', 'rates', 'incall', 'outcall', 'location', 'contact', 'schedule', 'characteristics',
        'user', 'default_services', 'default_rates', 'default_availability', 'metadata', 'page_stats',
        'pending_plan', 'plans', 'price', 'pages', 'stats',
    ];

    public static function json($data, int $status = 200, array $headers = []): JsonResponse
    {
        return new JsonResponse(self::objects($data), $status, $headers,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
    }

    /** Stop and answer with an error: {"detail": $detail}. */
    public static function fail(int $status, string $detail): never
    {
        throw new HttpResponseException(self::json(['detail' => $detail], $status));
    }

    /** The JSON body of the request as an array ([] when empty or not JSON). */
    public static function body(Request $request): array
    {
        $raw = $request->getContent();
        if ($raw === '' || $raw === null) {
            return [];
        }
        $d = json_decode($raw, true);
        if (!is_array($d)) {
            throw new HttpResponseException(self::json(['detail' => [[
                'type' => 'json_invalid', 'loc' => ['body'], 'msg' => 'JSON decode error', 'input' => [],
            ]]], 422));
        }
        return $d;
    }

    /**
     * Check and convert the body fields, like the earlier backend did.
     * $schema: field => 'str' | 'email' | 'int' | 'float' | 'bool' | 'dict' | 'list' | 'any', with '?' in front for optional
     * (optional fields default to null unless $defaults gives a value).
     */
    public static function validate(array $body, array $schema, array $defaults = []): array
    {
        $out = [];
        $errors = [];
        foreach ($schema as $field => $type) {
            $optional = str_starts_with($type, '?');
            $type = ltrim($type, '?');
            if (!array_key_exists($field, $body) || ($body[$field] === null && $optional)) {
                if ($optional) {
                    $out[$field] = $defaults[$field] ?? null;
                } else {
                    $errors[] = ['type' => 'missing', 'loc' => ['body', $field], 'msg' => 'Field required', 'input' => $body];
                }
                continue;
            }
            $v = $body[$field];
            $ok = true;
            switch ($type) {
                case 'str':
                    $ok = is_string($v);
                    break;
                case 'email':
                    $ok = is_string($v) && filter_var(trim($v), FILTER_VALIDATE_EMAIL, FILTER_FLAG_EMAIL_UNICODE) !== false;
                    if ($ok) {
                        [$local, $domain] = explode('@', trim($v), 2);
                        $v = $local.'@'.strtolower($domain);
                    }
                    break;
                case 'int':
                    if (is_int($v)) {
                        break;
                    }
                    if ((is_float($v) && floor($v) == $v) || (is_string($v) && preg_match('/^\s*-?\d+\s*$/', $v))) {
                        $v = (int) $v;
                    } else {
                        $ok = false;
                    }
                    break;
                case 'float':
                    if (is_int($v) || is_float($v)) {
                        $v = (float) $v;
                    } elseif (is_string($v) && is_numeric(trim($v))) {
                        $v = (float) trim($v);
                    } else {
                        $ok = false;
                    }
                    break;
                case 'bool':
                    if (is_bool($v)) {
                        break;
                    }
                    $s = is_string($v) ? strtolower(trim($v)) : $v;
                    if (in_array($s, [1, '1', 'true', 'yes', 'on', 't', 'y'], true)) {
                        $v = true;
                    } elseif (in_array($s, [0, '0', 'false', 'no', 'off', 'f', 'n'], true)) {
                        $v = false;
                    } else {
                        $ok = false;
                    }
                    break;
                case 'dict':
                    $ok = is_array($v) && (array_is_list($v) ? $v === [] : true);
                    break;
                case 'list':
                    $ok = is_array($v) && array_is_list($v);
                    break;
                case 'strlist':
                    $ok = is_array($v) && array_is_list($v) && count(array_filter($v, fn ($x) => !is_string($x))) === 0;
                    break;
            }
            if (!$ok) {
                $errors[] = ['type' => $type.'_type', 'loc' => ['body', $field], 'msg' => 'Input should be a valid '.$type, 'input' => $v];
            } else {
                $out[$field] = $v;
            }
        }
        if ($errors) {
            throw new HttpResponseException(self::json(['detail' => $errors], 422));
        }
        return $out;
    }

    /** Recursively turn empty arrays under OBJECT_KEYS into {} for the JSON answer. */
    public static function objects($data)
    {
        if (!is_array($data)) {
            return $data;
        }
        foreach ($data as $k => $v) {
            if (is_array($v)) {
                $v = self::objects($v);
                if ($v === [] && is_string($k) && in_array($k, self::OBJECT_KEYS, true)) {
                    $v = new \stdClass();
                }
                $data[$k] = $v;
            }
        }
        return $data;
    }

    /** A random id like the earlier backend: prefix + hex. */
    public static function id(string $prefix, int $hex = 12): string
    {
        return $prefix.'_'.substr(bin2hex(random_bytes(16)), 0, $hex);
    }
}
