import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { updateAutoRenew, deleteProviderProfile } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { notifyError } from '@/lib/notify';
import { LightPage } from '@/components/site/Shell';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import VerificationModal from '@/components/VerificationModal';
import { StatusCard, MessagesCard, InvoicesCard, ProfileSections, VerificationBanner, DangerZone, Ico } from '@/components/advertiser/DashboardParts';
import { Check } from '@/components/site/Form';
import { profileState } from './useAdvertiser';

/** Independent advertiser dashboard ("Manage profile"). */
export default function IndependentDashboard({ adv }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [verify, setVerify] = useState(false);
  const { profile: p, data, sub, enquiries, unread, invoices, media, reload } = adv;
  const state = profileState(p, sub);
  const first = (p.display_name || '').split(' ')[0];

  const toggleRenew = async (v) => {
    try { await updateAutoRenew(v); await reload(); toast.success(v ? 'Auto-renew is on' : 'Auto-renew is off'); }
    catch (err) { notifyError(err, "We couldn't update auto-renew."); }
  };
  const remove = async () => {
    try { await deleteProviderProfile(); toast.success('Your profile was removed.'); await logout(); navigate('/'); }
    catch (err) { notifyError(err, "We couldn't remove your profile."); }
  };

  return (
    <LightPage>
      <div className="adv" data-testid="independent-dashboard">
        <EmailVerificationBanner user={user} />
        <header className="dhead" data-testid="manage-header">
          <div className="tt">
            <span className="ey">Manage profile</span>
            <h1>Welcome back, {first}</h1>
            <div className="meta">
              {p.verified ? <span className="b-verl"><Check />Verified</span> : <span className="b-pendl">{p.verification_status === 'submitted' ? 'Verification pending' : 'Not verified yet'}</span>}
              {(p.location?.city || p.location?.country) && <span className="loc">{Ico.pin}{[p.location?.city, p.location?.country].filter(Boolean).join(', ')}</span>}
            </div>
          </div>
          <Link to={`/providers/${p.provider_id}`} className="x-btn ghostc" target="_blank" rel="noopener noreferrer" data-testid="view-public-profile">View public profile{Ico.ext}</Link>
        </header>

        <div className="dgrid">
          <div className="g3">
            <StatusCard state={state} sub={sub} latestInvoice={invoices[0]} planHref="/dashboard/plan" onToggleRenew={toggleRenew} />
            <MessagesCard enquiries={enquiries} unread={unread} pending={state !== 'live'} />
            <InvoicesCard invoices={invoices} plans={sub?.plans} />
          </div>

          <VerificationBanner profile={p} onStart={() => setVerify(true)} />

          <ProfileSections data={data} media={media} edit={(s) => `/dashboard/edit/${s}`} />

          <DangerZone onRemove={remove} />
        </div>
      </div>
      <VerificationModal open={verify} onClose={() => setVerify(false)} onSubmitted={reload} />
    </LightPage>
  );
}
