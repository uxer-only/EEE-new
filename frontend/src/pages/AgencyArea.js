import { Navigate, useParams } from 'react-router-dom';
import { LightPage } from '@/components/site/Shell';
import useAgency from './advertiser/useAgency';
import useAdvertiser from './advertiser/useAdvertiser';
import AgencySetup from './advertiser/AgencySetup';
import AgencyDashboard from './advertiser/AgencyDashboard';
import AgencyDefaultsEdit from './advertiser/AgencyDefaultsEdit';
import CompanionWizard from './advertiser/CompanionWizard';
import AgencyCompanion from './advertiser/AgencyCompanion';
import EditSection from './advertiser/EditSection';

const DEFAULT_SECTIONS = ['basic', 'services', 'availability', 'rates'];
const PROFILE_SECTIONS = ['basic', 'photos', 'services', 'rates'];
const Busy = () => <LightPage><div className="adv" aria-busy="true" style={{ minHeight: '50vh' }} /></LightPage>;

/** One agency companion, loaded by id (profile page or one section in edit mode). */
function Companion({ ag, providerId, section }) {
  const adv = useAdvertiser(providerId);
  if (adv.loading) return <Busy />;
  if (!adv.profile) return <Navigate to="/dashboard" replace />;
  const name = adv.profile.display_name || 'this companion';
  if (section) {
    if (!PROFILE_SECTIONS.includes(section)) return <Navigate to={`/dashboard/companion/${providerId}`} replace />;
    return (
      <EditSection
        key={section} adv={adv} section={section} providerId={providerId} who="her" name={name}
        backHref={`/dashboard/companion/${providerId}`} backLabel={`Back to ${name}’s profile`}
        eyebrow={`${name} · ${ag.agency?.agency_name || 'Your agency'}`}
      />
    );
  }
  return <AgencyCompanion adv={adv} agency={ag.agency} providerId={providerId} />;
}

/**
 * Agency area.
 *  view="home"       /dashboard                                → setup wizard (first time) or the dashboard
 *  view="defaults"   /dashboard/defaults/:section              → edit one section of the agency defaults
 *  view="new"        /dashboard/companion/new                  → add a companion profile (4 steps)
 *  view="companion"  /dashboard/companion/:providerId[/edit/:section]
 */
export default function AgencyArea({ view = 'home' }) {
  const { section, providerId } = useParams();
  const ag = useAgency();

  if (ag.loading) return <Busy />;
  if (!ag.agency?.onboarded) {
    return view === 'home' ? <AgencySetup onDone={ag.reload} /> : <Navigate to="/dashboard" replace />;
  }
  if (view === 'defaults') {
    if (!DEFAULT_SECTIONS.includes(section)) return <Navigate to="/dashboard" replace />;
    return <AgencyDefaultsEdit key={section} ag={ag} section={section} />;
  }
  if (view === 'new') return <CompanionWizard agency={ag.agency} onDone={ag.reload} />;
  if (view === 'companion') return <Companion ag={ag} providerId={providerId} section={section} />;
  return <AgencyDashboard ag={ag} />;
}
