import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { getPendingVerifications, updateVerification, getAdminStats } from '@/services/api';
import { notifyError } from '@/lib/notify';
import { AdminPage, AdminHead, AI, DocTiles, fmtDayTime } from '@/components/admin/AdminParts';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

function Card({ v, tab, onDone }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const docs = v.documents || [];
  const decide = async (status) => {
    setBusy(true);
    try {
      await updateVerification(v.provider_id, { status, reason: status === 'rejected' ? reason.trim() : undefined });
      toast.success(status === 'approved' ? `${v.display_name} is verified` : `Rejection sent for ${v.display_name}`);
      onDone();
    } catch (e) { notifyError(e, "We couldn't save this decision."); }
    finally { setBusy(false); }
  };
  const sub = [v.user?.email, [v.location?.city, v.location?.country].filter(Boolean).join(', '), v.age && `${v.age} y/o`, cap(v.gender)].filter(Boolean).join(' · ');
  return (
    <section className="adm-card adm-vcard" id={v.provider_id} data-testid={`ver-${v.provider_id}`}>
      <div className="top">
        <span className="adm-av l">{AI.user}</span>
        <span className="tx">
          <span className="n1"><Link to={`/admin/providers/${v.provider_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{v.display_name}</Link><span className="adm-tag">{v.owner_type === 'agency' ? `Agency · ${v.agency_name || ''}` : 'Independent'}</span></span>
          <span className="sub1">{sub}</span>
          <span className="sub2">{AI.clock}Submitted {fmtDayTime(v.submitted_at)} · {docs.length} document{docs.length === 1 ? '' : 's'}</span>
        </span>
        {tab === 'pending' && !rejecting && (
          <span className="bt">
            <button type="button" className="btn-rej" onClick={() => setRejecting(true)} data-testid={`reject-${v.provider_id}`}>Reject with reason</button>
            <button type="button" className="btn-app" disabled={busy} onClick={() => decide('approved')} data-testid={`approve-${v.provider_id}`}>{AI.check}Approve</button>
          </span>
        )}
        {tab === 'approved' && <span className="apill ver">{AI.check}Approved</span>}
        {tab === 'rejected' && <span className="apill bad">Rejected</span>}
      </div>
      <DocTiles docs={docs} />
      {tab === 'rejected' && v.rejection_reason && <p className="adm-vdone"><b>Reason sent:</b> {v.rejection_reason}</p>}
      {rejecting && (
        <div className="rej-box adm-reason">
          <span>Reason (sent to provider)</span>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. ID photo is blurry — please resubmit with clearer corners" autoFocus data-testid={`reason-${v.provider_id}`} />
          <small>The {v.owner_type === 'agency' ? 'agency' : 'advertiser'} receives this by e-mail and can resubmit from their dashboard.</small>
          <div className="bt2">
            <button type="button" className="btn-back" onClick={() => { setRejecting(false); setReason(''); }}>Back</button>
            <button type="button" className="btn-send" disabled={busy || reason.trim().length < 3} onClick={() => decide('rejected')} data-testid={`send-${v.provider_id}`}>{busy ? 'Sending…' : 'Send rejection'}</button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Admin: ID verification queue (pending oldest first; approved / rejected history). */
export default function AdminVerifications() {
  const { hash } = useLocation();
  const [tab, setTab] = useState('pending');
  const [list, setList] = useState(null);
  const [counts, setCounts] = useState({});

  const load = useCallback(() => {
    getPendingVerifications(tab).then(({ data }) => setList(data || [])).catch((e) => { notifyError(e, "We couldn't load the queue."); setList([]); });
    getAdminStats().then(({ data }) => setCounts({ pending: data.verifications_waiting, approved: data.verifications_approved, rejected: data.verifications_rejected })).catch(() => {});
  }, [tab]);
  useEffect(() => { setList(null); load(); }, [load]);
  useEffect(() => {
    if (list && hash) { const el = document.getElementById(hash.slice(1)); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }, [list, hash]);

  const n = counts.pending ?? 0;
  return (
    <AdminPage active="overview" testId="admin-verifications">
      <AdminHead title="Verification queue" sub={`${n} submission${n === 1 ? '' : 's'} awaiting review · oldest first · the advertiser is e-mailed every decision`} />
      <div className="adm-vtabs" role="tablist" aria-label="Verification status">
        {[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} data-testid={`vtab-${k}`}>
            {l}<span className={`n${k === 'pending' && counts.pending ? ' hot' : ''}`}>{counts[k] ?? 0}</span>
          </button>
        ))}
      </div>
      {list && list.length === 0 && <p className="adm-empty">{tab === 'pending' ? 'Nothing to review. New submissions appear here.' : `No ${tab} verifications yet.`}</p>}
      {(list || []).map((v) => <Card key={v.provider_id} v={v} tab={tab} onDone={load} />)}
    </AdminPage>
  );
}
