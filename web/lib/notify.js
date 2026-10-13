'use client';

import { toast } from 'sonner';

// Friendly labels for backend field names (used when parsing 422 validation errors)
const FIELD_LABELS = {
  display_name: 'Display name',
  location: 'Location',
  city: 'City',
  country: 'Country',
  email: 'Email',
  password: 'Password',
  new_password: 'New password',
  age: 'Age',
  name: 'Name',
  message: 'Message',
  phone: 'Phone number',
  agency_name: 'Agency name',
  services: 'Services',
  rates: 'Rates',
  photos: 'Photos',
};

const humanizeField = (key) =>
  FIELD_LABELS[key] || String(key).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Turn a FastAPI/pydantic 422 `detail` array into a readable "what to do" instruction.
const parseValidationDetail = (detail) => {
  const missing = [];
  const invalid = [];
  for (const item of detail) {
    const loc = Array.isArray(item?.loc) ? item.loc : [];
    // Skip the leading "body"/"query" scope entry
    const field = loc.filter((p) => p !== 'body' && p !== 'query').pop();
    if (!field) continue;
    const label = humanizeField(field);
    if (item?.type === 'missing') missing.push(label);
    else invalid.push(label);
  }
  const parts = [];
  if (missing.length) parts.push(`fill in ${[...new Set(missing)].join(', ')}`);
  if (invalid.length) parts.push(`fix ${[...new Set(invalid)].join(', ')}`);
  if (!parts.length) return 'Please review the highlighted fields and try again.';
  return `Please ${parts.join(' and ')}, then try again.`;
};

/**
 * Build a two-part { title, description } message from an API error (see lib/api.js).
 * `fallbackWhat` describes what the app was trying to do, e.g. "We couldn't save your profile."
 */
export const describeError = (error, fallbackWhat = 'Something went wrong.') => {
  // No response at all → network / server unreachable / timeout
  if (!error?.response) {
    const timedOut = error?.code === 'ECONNABORTED';
    return {
      title: timedOut ? 'The request timed out.' : "We couldn't reach the server.",
      description:
        'What to do: Check your internet connection and try again in a moment. If it keeps failing, refresh the page.',
    };
  }

  const { status, data } = error.response;
  const detail = data?.detail;

  // Server sent a plain, human-readable reason → trust it as "what happened"
  if (typeof detail === 'string' && detail.trim()) {
    const actionByStatus = {
      401: 'Please sign in again to continue.',
      403: 'If you believe this is a mistake, contact support.',
      404: 'Please refresh the page and try again.',
      409: 'Please refresh to load the latest data, then retry.',
    };
    return {
      title: detail,
      description: `What to do: ${actionByStatus[status] || 'Please correct this and try again.'}`,
    };
  }

  // Validation errors (array of field problems)
  if (status === 422 && Array.isArray(detail)) {
    return { title: fallbackWhat, description: `What to do: ${parseValidationDetail(detail)}` };
  }

  switch (status) {
    case 401:
      return {
        title: 'Your session has expired.',
        description: 'What to do: Please sign in again to continue.',
      };
    case 403:
      return {
        title: "You don't have permission to do that.",
        description: 'What to do: Sign in with the right account, or contact support if this seems wrong.',
      };
    case 404:
      return {
        title: "We couldn't find what you were looking for.",
        description: 'What to do: Refresh the page — the item may have been moved or removed.',
      };
    case 413:
      return {
        title: 'Your upload is too large.',
        description:
          'What to do: Remove a few photos or use smaller, compressed images (aim for under 10 MB each), then try again.',
      };
    case 429:
      return {
        title: 'Too many attempts.',
        description: 'What to do: Please wait a minute before trying again.',
      };
    default:
      if (status >= 500) {
        return {
          title: 'The server ran into a problem.',
          description: 'What to do: Please try again in a few moments. If it keeps happening, contact support.',
        };
      }
      return {
        title: fallbackWhat,
        description: 'What to do: Please try again. If the problem continues, contact support.',
      };
  }
};

/** Show a two-part error toast built from an API error. */
export const notifyError = (error, fallbackWhat) => {
  const { title, description } = describeError(error, fallbackWhat);
  toast.error(title, { description });
};

/** Show a two-part error toast for a client-side problem (validation, etc.). */
export const notifyProblem = (what, action) => {
  toast.error(what, { description: action ? `What to do: ${action}` : undefined });
};
