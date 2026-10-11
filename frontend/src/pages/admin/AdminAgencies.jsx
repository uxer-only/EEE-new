import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { getAdminAgencies, getAdminAgencyDetail, suspendAgency, deleteAgency } from '@/services/api';
import { notifyError } from '@/lib/notify';
import { Dialog } from '@/components/advertiser/DashboardParts';
import { AdminPage, AdminHead, AI, Tabs, Search, Pager, abs } from '@/components/admin/AdminParts';

const PER = 10;

function Roster({ id }) {
  const [d, setD] = useState(null);
  useEffect(() => { getAdminAgencyDetail(id).then(({ data }) => setD(data)).catch(() => setD({ profiles: [] })); }, [id]);
  if (!d) return <div className="adm-roster" aria-busy="true"><span className="rh">Loading companion profiles…</span></div>;
  const list = d.profiles || [];
  const live = list.filter((p) => p.live).length;
  return (
    <div className="adm-roster">
      <span className="rh">{list.length} companion profile{list.length === 1 ? '' : 's'} · {live} live</span>
      {list.length === 0 ? <p className="adm-none">This agency has no companion profiles yet.</p> : (
        <div className="grid">
          {list.map((p) => (
            <Link key={p.provider_id} to={`/admin/providers/${p.provider_id}`} className="adm-comp" data-testid={`comp-${p.provider_id}`}>
              <span className="th">{p.photos?.[0] ? <img src={abs(p.photos[0])} alt="" /> : AI.user}</span>
              <span className="tx">
                <span><b>{p.display_name}</b>{[p.age, p.location?.city].filter(Boolean).join(' · ')}</span>
                <span className="pills">
                  {p.live ? <span className="apill live sm"><i />Live</span> : <span className="apill off sm"><i />{p.suspended ? 'Suspended' : 'Offline'}</span>}
                  {p.verified ? <span className="apill ver sm">{AI.check}Verified</span> : p.verification_status === 'submitted' ? <span className="apill pend sm">Verification pending</span> : <span className="apill unv sm">Not verified</span>}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Admin: agency accounts, their companion profiles, suspend / reactivate / delete. */
export default function AdminAgencies() {
  const { hash } = useLocation();
  const [list, setList] = useState(null);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(() => (hash ? { [hash.slice(1)]: true } : {}));
  const [ask, setAsk] = useState(null); // { kind: 'suspend' | 'delete', ag }
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => getAdminAgencies().then(({ data }) => setList(data || [])).catch((e) => { notifyError(e, "We couldn't load the agencies."); setList([]); }), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => setPage(1), [tab, q]);

  const all = list || [];
  const active = all.filter((a) => !a.suspended);
  const susp = all.filter((a) => a.suspended);
  const shown = (() => {
    const base = tab === 'active' ? active : tab === 'suspended' ? susp : all;
    const t = q.trim().toLowerCase();
    return t ? base.filter((a) => `${a.agency_name} ${a.email || ''} ${a.location?.city || ''}`.toLowerCase().includes(t)) : base;
  })();
  const pages = Math.max(1, Math.ceil(shown.length / PER));
  const rows = shown.slice((page - 1) * PER, page * PER);
  const total = all.reduce((s, a) => s + (a.total_profiles || 0), 0);
  const live = all.reduce((s, a) => s + (a.live_profiles || 0), 0);

  const doSuspend = async (ag, suspend) => {
    setBusy(true);
    try { await suspendAgency(ag.user_id, suspend); toast.success(suspend ? `${ag.agency_name} is suspended — its profiles are offline.` : `${ag.agency_name} is active again.`); setAsk(null); load(); }
    catch (e) { notifyError(e, "We couldn't update this agency."); }
    finally { setBusy(false); }
  };
  const doDelete = async (ag) => {
    setBusy(true);
    try { await deleteAgency(ag.user_id); toast.success(`${ag.agency_name} was deleted.`); setAsk(null); load(); }
    catch (e) { notifyError(e, "We couldn't delete this agency."); }
    finally { setBusy(false); }
  };

  return (
    <AdminPage active="agencies" testId="admin-agencies">
      <AdminHead title="Agencies" sub="Agency accounts and their companion profiles. Suspending an agency takes all of its profiles offline." />
      <div className="adm-stats4">
        <div className="adm-mini"><span className="i">{AI.building}</span><span><span className="t">Total agencies</span><b>{all.length}</b></span></div>
        <div className="adm-mini"><span className="i">{AI.users}</span><span><span className="t">Companion profiles</span><b>{total}</b></span></div>
        <div className="adm-mini"><span className="i green">{AI.live}</span><span><span className="t">Live profiles</span><b>{live}</b></span></div>
        <div className="adm-mini"><span className="i red">{AI.ban}</span><span><span className="t">Suspended</span><b className={susp.length ? 'red' : ''}>{susp.length}</b></span></div>
      </div>

      <section className="adm-card" aria-labelledby="ag-t">
        <div className="hd"><div><h2 id="ag-t">All agencies</h2><p>Select an agency or View to see its companion profiles</p></div></div>
        <div className="adm-tools">
          <Tabs label="Filter" value={tab} onChange={setTab} options={[{ value: 'all', label: 'All', count: all.length }, { value: 'active', label: 'Active', count: active.length }, { value: 'suspended', label: 'Suspended', count: susp.length }]} />
          <Search value={q} onChange={setQ} placeholder="Search by name, e-mail or city" testId="search-agencies" />
        </div>
        <div className="adm-rows">
          <div className="adm-athead"><span>Agency · location</span><span>Contact e-mail</span><span>Profiles</span><span>Status</span><span className="r">Actions</span></div>
          {list && rows.length === 0 && <p className="adm-empty">No agencies match.</p>}
          {rows.map((a) => {
            const isOpen = !!open[a.user_id];
            const toggle = () => setOpen((o) => ({ ...o, [a.user_id]: !o[a.user_id] }));
            return (
              <div key={a.user_id} id={a.user_id} className={`adm-ag${isOpen ? ' open' : ''}${a.suspended ? ' susp' : ''}`} data-testid={`agency-${a.user_id}`}>
                <div className="adm-arow">
                  <button type="button" className="nm" aria-expanded={isOpen} onClick={toggle}>
                    <span className="cv">{AI.chevR}</span>
                    <span><b>{a.agency_name}</b><small>{[a.location?.city, a.location?.country].filter(Boolean).join(', ') || '—'}</small></span>
                  </button>
                  <span className="em">{a.email}</span>
                  <span className="pr"><b>{a.total_profiles}</b> total · <span className="lv">{a.live_profiles} live</span></span>
                  <span className="st">{a.suspended ? <span className="apill bad"><i />Suspended</span> : <span className="apill live"><i />Active</span>}</span>
                  <span className="acts">
                    <button type="button" className="vw" onClick={toggle}>{isOpen ? 'Hide' : 'View'}</button>
                    {a.suspended
                      ? <button type="button" className="rea" disabled={busy} onClick={() => doSuspend(a, false)} data-testid={`reactivate-${a.user_id}`}>{AI.check}Reactivate</button>
                      : <button type="button" className="sus" onClick={() => setAsk({ kind: 'suspend', ag: a })} data-testid={`suspend-${a.user_id}`}>{AI.ban}Suspend</button>}
                    <button type="button" className="del" onClick={() => setAsk({ kind: 'delete', ag: a })} data-testid={`delete-${a.user_id}`}>{AI.trash}Delete</button>
                  </span>
                </div>
                {isOpen && <Roster key={`${a.user_id}-${a.suspended}`} id={a.user_id} />}
              </div>
            );
          })}
        </div>
        <Pager page={page} pages={pages} onPage={setPage} total={shown.length} from={(page - 1) * PER + 1} to={Math.min(page * PER, shown.length)} noun="agencies" />
      </section>

      {ask?.kind === 'suspend' && (
        <Dialog title={`Suspend ${ask.ag.agency_name}?`} onClose={() => setAsk(null)}
          footer={<><button type="button" className="x-btn white" onClick={() => setAsk(null)}>Cancel</button><button type="button" className="x-btn dangerb" disabled={busy} onClick={() => doSuspend(ask.ag, true)} data-testid="confirm-suspend">{busy ? 'Suspending…' : 'Suspend agency'}</button></>}>
          <p className="dtext">All {ask.ag.total_profiles} companion profiles go offline right away. You can reactivate the agency any time.</p>
        </Dialog>
      )}
      {ask?.kind === 'delete' && (
        <Dialog title={`Delete ${ask.ag.agency_name}?`} danger onClose={() => setAsk(null)}
          footer={<><button type="button" className="x-btn white" onClick={() => setAsk(null)}>Cancel</button><button type="button" className="x-btn dangerb" disabled={busy} onClick={() => doDelete(ask.ag)} data-testid="confirm-delete-agency">{busy ? 'Deleting…' : 'Delete permanently'}</button></>}>
          <p className="dtext">This permanently deletes the agency account, its {ask.ag.total_profiles} companion profiles, their photos, messages and subscriptions. This can’t be undone.</p>
        </Dialog>
      )}
    </AdminPage>
  );
}
