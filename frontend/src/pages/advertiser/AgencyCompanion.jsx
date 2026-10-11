import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { deleteProviderProfile } from '@/services/api';
import { notifyError } from '@/lib/notify';
import { LightPage } from '@/components/site/Shell';
import VerificationModal from '@/components/VerificationModal';
import { ProfileSections, VerificationBanner, DangerZone, Ico } from '@/components/advertiser/DashboardParts';
import { ArrowL, Check } from '@/components/site/Form';
import '@/styles/advertiser.css';
import '@/styles/dashboard.css';

/** Agency: one companion's profile, section by section, with edit links. */
export default function AgencyCompanion({ adv, agency, providerId }) {
  const navigate = useNavigate();
  const [verify, setVerify] = useState(false);
  const { profile: p, data, media, reload } = adv;
  const name = p.display_name || 'This companion';
  const where = [p.age, [p.location?.city, p.location?.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ');

  const remove = async () => {
    try { await deleteProviderProfile(providerId); toast.success(`${name}’s profile was removed.`); navigate('/dashboard'); }
    catch (err) { notifyError(err, "We couldn't remove this profile."); }
  };

  return (
    <LightPage>
      <div className="adv" data-testid="agency-companion">
        <Link to="/dashboard" className="back-l"><ArrowL />Back to agency dashboard</Link>
        <header className="dhead">
          <div className="tt">
            <span className="ey">Companion profile · {agency?.agency_name || 'Your agency'}</span>
            <h1>{name}</h1>
            <div className="meta">
              {p.verified ? <span className="b-verl"><Check />Verified</span> : <span className="b-pendl">{p.verification_status === 'submitted' ? 'Verification pending' : 'Not verified yet'}</span>}
              {where && <span className="loc">{Ico.pin}{where}</span>}
            </div>
          </div>
          <Link to={`/providers/${providerId}`} className="x-btn ghostc" target="_blank" rel="noopener noreferrer" data-testid="view-public-profile">View public profile{Ico.ext}</Link>
        </header>
        <div className="dgrid">
          <VerificationBanner profile={p} name={name} onStart={() => setVerify(true)} />
          <ProfileSections data={data} media={media} who="her" edit={(s) => `/dashboard/companion/${providerId}/edit/${s}`} />
          <DangerZone
            onRemove={remove} label={`Remove ${name}’s profile`}
            text={`This permanently deletes ${name}’s profile, photos and verification documents. Your agency and other companion profiles are not affected. This can’t be undone.`}
          />
        </div>
      </div>
      <VerificationModal open={verify} providerId={providerId} onClose={() => setVerify(false)} onSubmitted={reload} />
    </LightPage>
  );
}
