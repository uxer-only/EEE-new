import { useCallback, useEffect, useState } from 'react';
import { getProviderDashboard, getMySubscription, listMyEnquiries, listMyInvoices, getMyMedia } from '@/services/api';
import { normalizeProfile } from '@/lib/profileData';

/**
 * Loads everything an advertiser dashboard needs for one profile.
 * providerId: agency companion id (omit for an independent's own profile).
 */
export default function useAdvertiser(providerId = null, { withExtras = true } = {}) {
  const [state, setState] = useState({ loading: true, profile: null, data: null, sub: null, enquiries: [], unread: 0, invoices: [], media: [] });

  const load = useCallback(async () => {
    let profile = null;
    try {
      const { data } = await getProviderDashboard(providerId);
      profile = data?.profile || null;
    } catch (e) {
      profile = null;
    }
    if (!profile) { setState((s) => ({ ...s, loading: false, profile: null, data: null })); return; }
    const next = { loading: false, profile, data: normalizeProfile(profile) };
    if (withExtras) {
      const [sub, enq, inv, med] = await Promise.allSettled([
        getMySubscription(providerId), listMyEnquiries(providerId), listMyInvoices(providerId), getMyMedia(providerId),
      ]);
      next.sub = sub.status === 'fulfilled' ? sub.value.data : null;
      next.enquiries = enq.status === 'fulfilled' ? enq.value.data?.enquiries || [] : [];
      next.unread = enq.status === 'fulfilled' ? enq.value.data?.unread || 0 : 0;
      next.invoices = inv.status === 'fulfilled' ? inv.value.data?.invoices || [] : [];
      next.media = med.status === 'fulfilled' ? med.value.data?.media || [] : [];
    }
    setState((s) => ({ ...s, ...next }));
  }, [providerId, withExtras]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

/** live | pending | expired | draft */
export function profileState(profile, sub) {
  if (!profile) return 'draft';
  if (sub?.featured_active) return profile.verified ? 'live' : 'pending';
  if (sub?.featured_until) return 'expired';
  return 'draft';
}
