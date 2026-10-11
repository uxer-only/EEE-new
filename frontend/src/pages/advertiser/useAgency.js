import { useCallback, useEffect, useState } from 'react';
import { getAgencyProfile, getAgencyProfiles } from '@/services/api';

/** Loads the agency master profile (defaults) and its companion roster. */
export default function useAgency() {
  const [state, setState] = useState({ loading: true, agency: null, profiles: [], error: false });

  const load = useCallback(async () => {
    try {
      const { data: agency } = await getAgencyProfile();
      let profiles = [];
      if (agency?.onboarded) {
        const { data } = await getAgencyProfiles();
        profiles = data?.profiles || [];
      }
      setState({ loading: false, agency, profiles, error: false });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: true }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const setProfiles = (fn) => setState((s) => ({ ...s, profiles: typeof fn === 'function' ? fn(s.profiles) : fn }));
  return { ...state, reload: load, setProfiles };
}
