import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getAdminProviderDetail, approveMedia, updateVerification } from '@/services/api';
import { notifyError } from '@/lib/notify';
import { AdminPage, Crumbs, AI, abs, fmtDay, fmtAgo, DocTiles, ReasonDialog } from '@/components/admin/AdminParts';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const dur = (sec) => (sec ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}` : '');

function ReviewTile({ m, onDecide }) {
  const video = m.media_type === 'video';
  const [len, setLen] = useState(0);
  return (
    <div className="adm-rv" data-testid={`review-${m.media_id}`}>
      <div className="im">
        {video ? <video src={abs(m.url)} muted preload="metadata" onLoadedMetadata={(e) => setLen(e.currentTarget.duration)} /> : <img src={abs(m.url)} alt="" />}
        <span className="b1">In review</span>
        <span className="b2">{video ? <>{AI.play}Video{len ? ` · ${dur(len)}` : ''}</> : <>{AI.photo}Photo</>}</span>
      </div>
      <small>Uploaded {fmtAgo(m.uploaded_at)}</small>
      <div className="bt">
        <button type="button" className="btn-ok" onClick={() => onDecide(m, 'approved')} data-testid={`approve-${m.media_id}`}>{AI.check}Approve</button>
        <button type="button" className="btn-no" onClick={() => onDecide(m, 'rejected')} data-testid={`reject-${m.media_id}`}>{AI.x}Reject</button>
      </div>
    </div>
  );
}

/** Admin: one advertiser (independent or agency companion) — media review and ID verification. */
export default function AdminAdvertiser() {
  const { providerId } = useParams();
  const [p, setP] = useState(null);
  const [rejectMedia, setRejectMedia] = useState(null);
  const [rejectVer, setRejectVer] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getAdminProviderDetail(providerId);
      setP(data);
    } catch (e) { notifyError(e, "We couldn't load this advertiser."); }
  }, [providerId]);
  useEffect(() => { load(); }, [load]);

  const decideMedia = async (m, status, reason) => {
    if (status === 'rejected' && !reason) { setRejectMedia(m); return; }
    try {
      await approveMedia(m.media_id, status, reason);
      toast.success(status === 'approved' ? 'Approved — it’s now on the public profile.' : 'Rejected — the reason was sent.');
      setRejectMedia(null);
      load();
    } catch (e) { notifyError(e, "We couldn't save this decision."); }
  };
  const decideVer = async (status, reason) => {
    setBusy(true);
    try {
      await updateVerification(providerId, { status, reason });
      toast.success(status === 'approved' ? 'Verification approved' : 'Verification rejected — the reason was sent.');
      setRejectVer(false);
      load();
    } catch (e) { notifyError(e, "We couldn't save this decision."); }
    finally { setBusy(false); }
  };

  if (!p) return <AdminPage active="independents"><div style={{ minHeight: '40vh' }} aria-busy="true" /></AdminPage>;

  const agency = p.owner_type === 'agency';
  const who = agency ? 'agency' : 'advertiser';
  const media = p.media || [];
  const pending = media.filter((m) => m.status === 'pending');
  const approved = media.filter((m) => m.status === 'approved');
  const rejected = media.filter((m) => m.status === 'rejected');
  const docs = p.documents || [];
  const vs = p.verification_status || 'pending';
  const name = p.display_name || 'Untitled profile';
  const cover = (p.photos || [])[0];
  const docsDate = docs[0]?.submitted_at;
  const hasSecondary = docs.some((d) => d.document_type === 'secondary_doc');

  return (
    <AdminPage active={agency ? 'agencies' : 'independents'} testId="admin-advertiser">
      <Crumbs items={agency
        ? [{ label: 'Agencies', to: '/admin/agencies' }, { label: p.agency_name || 'Agency', to: `/admin/agencies#${p.user_id}` }, { label: name }]
        : [{ label: 'Independents', to: '/admin/independents' }, { label: name }]} />

      <section className="adm-card adm-prof">
        <span className="ph">{cover ? <img src={abs(cover)} alt="" /> : AI.user}</span>
        <div className="bd">
          <h1>
            <span>{name}{p.age && <span className="age">, {p.age}</span>}</span>
            {p.verified ? <span className="apill ver">{AI.check}Verified</span> : vs === 'submitted' ? <span className="apill pend">{AI.clock}Verification pending</span> : vs === 'rejected' ? <span className="apill bad">Verification rejected</span> : <span className="apill unv">Not verified</span>}
            {p.vip_active && <span className="apill" style={{ background: '#F5EAF0', color: '#B04585' }}>{AI.crown}VIP</span>}
          </h1>
          <div className="facts">
            <span>{AI.mail}{p.user?.email}{agency && <small>(agency)</small>}</span>
            {(p.location?.city || p.location?.country) && <span>{AI.pin}{[p.location?.city, p.location?.country].filter(Boolean).join(', ')}</span>}
            {p.created_at && <span>{AI.cal}{agency ? 'Added' : 'Joined'} {fmtDay(p.created_at)}</span>}
          </div>
          <div className="facts"><span>{AI.user}{[cap(p.gender), agency ? 'Agency companion' : 'Independent'].filter(Boolean).join(' · ')}</span></div>
          {agency && (
            <div className="adm-managed">
              <span className="i">{AI.house}</span>
              <span className="tx"><b>Managed by {p.agency_name || 'an agency'}</b>The agency is the account holder: it pays her plan and receives every approval and rejection e-mail.</span>
              <Link to={`/admin/agencies#${p.user_id}`}>View agency{AI.arrow}</Link>
            </div>
          )}
          <div className="adm-plan">
            <div><span>Plan</span><b>{p.featured_active ? `Featured${p.plan_length ? ` · ${p.plan_length}` : ''}${agency ? ' · paid by agency' : ''}` : 'No active plan'}</b></div>
            {p.featured_until && <div><span>Featured until</span><b>{fmtDay(p.featured_until)}{p.featured_active ? ` · ${Math.round(p.featured_days_left)} days left` : ' · ended'}</b></div>}
            {p.vip_active && <div><span>VIP until</span><b>{fmtDay(p.vip_until)} · {Math.round(p.vip_days_left)} days left</b></div>}
            <div><span>Visibility</span>{p.live ? <b className="lv">Live</b> : <b className="off">{p.suspended ? 'Suspended' : 'Offline'}</b>}</div>
          </div>
        </div>
      </section>

      <section className="adm-card" aria-labelledby="rv-t">
        <div className="adm-sh"><span className="i amber">{AI.clock}</span><span className="tx"><h2 id="rv-t">In review <span className="c">({pending.length})</span></h2><p>Not visible on the public profile until approved</p></span></div>
        {pending.length === 0 ? <p className="adm-empty">Nothing waiting for review.</p> : <div className="adm-review">{pending.map((m) => <ReviewTile key={m.media_id} m={m} onDecide={decideMedia} />)}</div>}
      </section>

      <section className="adm-card" aria-labelledby="ap-t">
        <div className="adm-sh"><span className="i green">{AI.check}</span><span className="tx"><h2 id="ap-t">Approved media <span className="c">({approved.length})</span></h2></span></div>
        {approved.length === 0 ? <p className="adm-empty">No approved media yet.</p> : (
          <ul className="adm-approved">
            {approved.map((m) => (
              <li key={m.media_id}>
                {m.media_type === 'video' ? <video src={abs(m.url)} muted preload="metadata" /> : <img src={abs(m.url)} alt="" loading="lazy" />}
                {m.media_type === 'video' && <span className="pl">{AI.play}</span>}
                <span className="ok">{AI.check}Approved</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {rejected.length > 0 && (
        <section className="adm-card" aria-labelledby="rj-t">
          <div className="adm-sh"><span className="i red">{AI.x}</span><span className="tx"><h2 id="rj-t">Rejected media <span className="c">({rejected.length})</span></h2></span></div>
          {rejected.map((m) => (
            <div key={m.media_id} className="adm-rej">
              <span className="th">{m.media_type === 'video' ? AI.play : <img src={abs(m.url)} alt="" />}</span>
              <span className="tx">
                <span className="m"><span className="apill bad sm">Rejected</span>{m.media_type === 'video' ? 'Video' : 'Photo'} · rejected {fmtDay(m.reviewed_at)}</span>
                <span><b>Reason sent:</b> {m.rejection_reason || 'No reason given.'}</span>
              </span>
            </div>
          ))}
        </section>
      )}

      <section className="adm-card" aria-labelledby="vd-t" id="verification">
        <div className="adm-sh">
          <span className="i rose">{AI.shield}</span>
          <span className="tx"><h2 id="vd-t">Verification documents</h2><p>{docs.length ? `${docs.length} documents submitted ${fmtDay(docsDate)}${hasSecondary ? '' : ' · secondary document not provided (optional)'} · visible to admins only` : 'No documents submitted yet'}</p></span>
          {vs === 'submitted' && <span className="apill pend">Awaiting review</span>}
          {vs === 'approved' && <span className="apill ver">Approved</span>}
          {vs === 'rejected' && <span className="apill bad">Rejected</span>}
        </div>
        {docs.length > 0 && <DocTiles docs={docs} />}
        {vs === 'submitted' && (
          <div className="adm-vfoot">
            <p>Check that the face on the selfie matches the ID and that she is 18 or older. The {who} is e-mailed your decision.</p>
            <div className="bt">
              <button type="button" className="btn-rej" onClick={() => setRejectVer(true)} data-testid="reject-verification">{AI.x}Reject with reason</button>
              <button type="button" className="btn-app" disabled={busy} onClick={() => decideVer('approved')} data-testid="approve-verification">{AI.check}Approve verification</button>
            </div>
          </div>
        )}
        {vs === 'rejected' && p.rejection_reason && <p className="adm-vdone"><b>Reason sent:</b> {p.rejection_reason}</p>}
      </section>

      {rejectMedia && <ReasonDialog title="Reject this item?" cta="Reject and send reason" placeholder="e.g. Face is fully visible — please crop or blur and upload again" help={`The ${who} receives this reason by e-mail.`} onClose={() => setRejectMedia(null)} onSend={(r) => decideMedia(rejectMedia, 'rejected', r)} />}
      {rejectVer && <ReasonDialog title="Reject verification?" help={`The ${who} receives this by e-mail and can resubmit from the dashboard.`} onClose={() => setRejectVer(false)} onSend={(r) => decideVer('rejected', r)} />}
    </AdminPage>
  );
}
