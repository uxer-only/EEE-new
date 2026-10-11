import { Navigate, useParams } from 'react-router-dom';
import { LightPage } from '@/components/site/Shell';
import useAdvertiser from './advertiser/useAdvertiser';
import ProfileWizard from './advertiser/ProfileWizard';
import IndependentDashboard from './advertiser/IndependentDashboard';
import EditSection from './advertiser/EditSection';
import ChangePlan from './advertiser/ChangePlan';

const SECTIONS = ['basic', 'photos', 'services', 'rates'];

/**
 * Independent advertiser area.
 *  view="home"  /dashboard            → onboarding wizard (no profile yet) or the dashboard
 *  view="edit"  /dashboard/edit/:s    → edit one section
 *  view="plan"  /dashboard/plan       → extend / upgrade / renew
 */
export default function ProviderDashboard({ view = 'home' }) {
  const { section } = useParams();
  const adv = useAdvertiser();

  if (adv.loading) {
    return <LightPage><div className="adv" aria-busy="true" style={{ minHeight: '50vh' }} /></LightPage>;
  }
  if (!adv.profile) {
    return view === 'home' ? <ProfileWizard onExit={adv.reload} /> : <Navigate to="/dashboard" replace />;
  }
  if (view === 'edit') {
    if (!SECTIONS.includes(section)) return <Navigate to="/dashboard" replace />;
    return <EditSection key={section} adv={adv} section={section} />;
  }
  if (view === 'plan') return <ChangePlan adv={adv} />;
  return <IndependentDashboard adv={adv} />;
}
