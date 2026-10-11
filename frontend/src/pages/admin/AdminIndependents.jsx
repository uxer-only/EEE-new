import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminProviders } from '@/services/api';
import { notifyError } from '@/lib/notify';
import { AdminPage, AdminHead, AI, Tabs, Search, Pager, Thumb } from '@/components/admin/AdminParts';

const PER = 10;

/** Admin: all independent advertisers, those needing action first. */
export default function AdminIndependents() {
  const [list, setList] = useState(null);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    getAdminProviders()
      .then(({ data }) => setList((data || []).filter((p) => p.owner_type !== 'agency')))
      .catch((e) => { notifyError(e, "We couldn't load the advertisers."); setList([]); });
  }, []);
  useEffect(() => setPage(1), [tab, q]);

  const all = list || [];
  const action = all.filter((p) => p.needs_action);
  const unver = all.filter((p) => !p.verified);
  const shown = (() => {
    const base = tab === 'action' ? action : tab === 'unverified' ? unver : all;
    const t = q.trim().toLowerCase();
    return t ? base.filter((p) => `${p.display_name} ${p.user?.email || ''}`.toLowerCase().includes(t)) : base;
  })();
  const pages = Math.max(1, Math.ceil(shown.length / PER));
  const rows = shown.slice((page - 1) * PER, page * PER);

  return (
    <AdminPage active="independents" testId="admin-independents">
      <AdminHead title="Independents" sub={list ? `${all.length} independent advertisers · ${action.length} with media or services waiting for review · ${unver.length} not verified yet` : ' '} />
      <section className="adm-card" aria-labelledby="ai-t">
        <div className="hd"><div><h2 id="ai-t">All independents</h2><p>Independents needing action are listed first · click a row to open the profile</p></div></div>
        <div className="adm-tools">
          <Tabs label="Filter" value={tab} onChange={setTab} options={[{ value: 'all', label: 'All', count: all.length }, { value: 'action', label: 'Action needed', count: action.length }, { value: 'unverified', label: 'Unverified', count: unver.length }]} />
          <Search value={q} onChange={setQ} placeholder="Search by name or e-mail" testId="search-independents" />
        </div>
        <div className="adm-rows" role="table" aria-label="Independents">
          <div className="adm-thead" role="row"><span>Status</span><span>Independent</span><span>E-mail</span><span>Location</span><span>Verified</span><span>In review</span><span /></div>
          {list && rows.length === 0 && <p className="adm-empty">No independents match.</p>}
          {rows.map((p) => (
            <Link key={p.provider_id} to={`/admin/providers/${p.provider_id}`} className={`adm-row${p.needs_action ? ' act' : ''}`} role="row" data-testid={`row-${p.provider_id}`}>
              <span className="st">{p.needs_action ? <span className="apill warn">{AI.warn}Action needed</span> : <span className="apill ok">{AI.check}OK</span>}</span>
              <span className="nm"><Thumb src={(p.photos || [])[0]} size="s" /><span><b>{p.display_name || 'Untitled profile'}</b><small>{p.plan_label}</small></span></span>
              <span className="em">{p.user?.email}</span>
              <span className="loc">{p.location?.city || '—'}</span>
              <span className="vr">{p.verified ? <span className="apill ver">Verified</span> : <span className="apill unv">{p.verification_status === 'submitted' ? 'Pending' : 'Unverified'}</span>}</span>
              <span className="pm">{(p.pending_media_count || 0) + (p.pending_services || []).length ? <span className="apill rev" title={`${p.pending_media_count || 0} photos or videos, ${(p.pending_services || []).length} custom services`}>{(p.pending_media_count || 0) + (p.pending_services || []).length} in review</span> : <span className="adm-none">None</span>}</span>
              <span className="go">{AI.chevR}</span>
            </Link>
          ))}
        </div>
        <Pager page={page} pages={pages} onPage={setPage} total={shown.length} from={(page - 1) * PER + 1} to={Math.min(page * PER, shown.length)} noun="independents" />
      </section>
    </AdminPage>
  );
}
