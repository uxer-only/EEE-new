import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats, getAdminTraffic, getPendingVerifications } from '@/services/api';
import { notifyError } from '@/lib/notify';
import { AdminPage, AdminHead, AI, fmtDayTime, fmtDay } from '@/components/admin/AdminParts';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const nf = (n) => Number(n || 0).toLocaleString('en');
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

/** Fills missing days with zero so the chart always shows the full period. */
function series(daily = [], days) {
  const by = Object.fromEntries(daily.map((d) => [d.date, d]));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ date: d, views: by[key]?.views || 0, unique: by[key]?.unique_visitors || 0 });
  }
  return out;
}

function Chart({ data }) {
  const W = 720; const H = 240; const L = 48; const B = 24;
  const max = Math.max(4, ...data.map((d) => d.views));
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step / 4) * step * 4 || 4;
  const x = (i) => L + (data.length === 1 ? 0 : (i * (W - L)) / (data.length - 1));
  const y = (v) => H - B - (v / top) * (H - B - 8);
  const line = (k) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(' ');
  const area = `${line('views')} L${x(data.length - 1)},${H - B} L${L},${H - B} Z`;
  const ticks = [0, 1, 2, 3, 4].map((t) => (top / 4) * t);
  const every = Math.ceil(data.length / 7);
  const last = data[data.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H + 8}`} role="img" aria-label={`Daily page views, ${data.length} days`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke="#ECE8EF" />
          <text x={L - 10} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#4A4452">{nf(t)}</text>
        </g>
      ))}
      <path d={area} fill="#F5EAF0" opacity=".6" />
      <path d={line('unique')} fill="none" stroke="#C97FA6" strokeWidth="2" strokeDasharray="6 5" />
      <path d={line('views')} fill="none" stroke="#B04585" strokeWidth="2.5" />
      <circle cx={x(data.length - 1)} cy={y(last.views)} r="5" fill="#fff" stroke="#B04585" strokeWidth="2" />
      <g transform={`translate(${Math.min(x(data.length - 1) - 40, W - 84)}, ${Math.max(y(last.views) - 34, 0)})`}>
        <rect width="84" height="22" rx="5" fill="#1B1820" />
        <text x="42" y="15" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{nf(last.views)} today</text>
      </g>
      {data.map((d, i) => ((data.length - 1 - i) % every === 0 ? (
        <text key={i} x={x(i)} y={H + 2} textAnchor="middle" fontSize="12" fill="#4A4452">{`${d.date.getDate()} ${MON[d.date.getMonth()]}`}</text>
      ) : null))}
    </svg>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [days, setDays] = useState(7);
  const [traffic, setTraffic] = useState(null);

  useEffect(() => {
    Promise.all([getAdminStats(), getPendingVerifications('pending')])
      .then(([s, v]) => { setStats(s.data); setQueue(v.data || []); })
      .catch((e) => notifyError(e, "We couldn't load the overview."));
  }, []);
  useEffect(() => {
    getAdminTraffic(days).then(({ data }) => setTraffic(data)).catch(() => setTraffic({ total_views: 0, total_unique_visitors: 0, daily_stats: [], page_stats: {} }));
  }, [days]);

  const s = stats || {};
  const today = new Date();
  const waiting = queue.length;
  const sub = `${DAYS[today.getDay()]} ${fmtDay(today.toISOString())} · ${plural(waiting, 'verification', 'verifications')} and ${plural(s.providers_needing_action || 0, 'advertiser', 'advertisers')} with media or services waiting for review`;
  const data = series(traffic?.daily_stats, days);
  const pages = Object.entries(traffic?.page_stats || {}).slice(0, 5);
  const topMax = Math.max(1, ...pages.map(([, v]) => v));
  const first = data[0]?.date; const lastD = data[data.length - 1]?.date;

  return (
    <AdminPage active="overview" testId="admin-overview">
      <AdminHead title="Overview" sub={stats ? sub : ' '} />

      <div className="adm-stats">
        <div className="adm-stat"><span className="t">Total providers</span><span className="i">{AI.users}</span><b>{nf(s.total_providers)}</b><span className="s">{s.independents?.total ?? 0} independent · {s.agencies?.companions ?? 0} agency</span></div>
        <div className="adm-stat hide-m"><span className="t">Total clients</span><span className="i">{AI.user}</span><b>{nf(s.total_clients)}</b><span className="s">+{s.clients_this_week || 0} this week</span></div>
        <div className="adm-stat"><span className="t">Pending media</span><span className="i amber">{AI.clock}</span><b className="amber">{nf(s.pending_media)}</b><span className="s">Photos and videos to review</span></div>
        <div className={`adm-stat${s.providers_needing_action ? ' alert' : ''}`}><span className="t">Need action</span><span className="i red">{AI.warn}</span><b className={s.providers_needing_action ? 'red' : ''}>{nf(s.providers_needing_action)}</b><span className="s">Advertisers with media or services to review</span></div>
        <div className="adm-stat"><span className="t">Verified</span><span className="i green">{AI.shield}</span><b>{nf(s.verified)}</b><span className="s">{s.not_verified || 0} not verified yet</span></div>
      </div>

      <section className="adm-card" aria-labelledby="vw-t" data-testid="verifications-waiting">
        <div className="hd">
          <div>
            <h2 id="vw-t">Verifications waiting {waiting > 0 && <span className="adm-n">{waiting}</span>}</h2>
            <p>ID documents to check · oldest first · the advertiser is e-mailed every decision</p>
          </div>
          <Link to="/admin/verifications" className="lnk-r">Open queue</Link>
        </div>
        {waiting === 0 ? <p className="adm-empty">No verifications waiting. New submissions appear here.</p> : (
          <div className="adm-vrows">
            {queue.slice(0, 5).map((v) => (
              <div key={v.provider_id} className="adm-vrow">
                <span className="adm-av m">{AI.user}</span>
                <span className="who">
                  <span className="n1">{v.display_name}<span className="adm-tag">{v.owner_type === 'agency' ? `Agency · ${v.agency_name || ''}` : 'Independent'}</span></span>
                  <span className="em">{[v.user?.email, v.location?.city].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="when">{AI.clock}Submitted {fmtDayTime(v.submitted_at)} · {plural((v.documents || []).length, 'document', 'documents')}</span>
                <Link to={`/admin/verifications#${v.provider_id}`} className="x-btn primary" data-testid={`review-${v.provider_id}`}>Review documents</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="adm-g2">
        <section className="adm-card adm-grp">
          <div className="top">
            <span className="i">{AI.user}</span>
            <span className="tx"><h2>Independents</h2><p>Independent advertisers with their own profile</p></span>
            <Link to="/admin/independents" className="open">Open{AI.arrow}</Link>
          </div>
          <div className="nums">
            <span><b>{s.independents?.total ?? 0}</b>advertisers</span>
            <span><b>{s.independents?.media_in_review ?? 0}</b>media in review</span>
            <span><b>{s.independents?.not_verified ?? 0}</b>not verified</span>
          </div>
        </section>
        <section className="adm-card adm-grp">
          <div className="top">
            <span className="i">{AI.house}</span>
            <span className="tx"><h2>Agencies</h2><p>Agency accounts and their companion profiles</p></span>
            <Link to="/admin/agencies" className="open">Open{AI.arrow}</Link>
          </div>
          <div className="nums">
            <span><b>{s.agencies?.total ?? 0}</b>agencies</span>
            <span><b>{s.agencies?.companions ?? 0}</b>companion profiles</span>
            <span><b>{s.agencies?.media_in_review ?? 0}</b>media in review</span>
          </div>
        </section>
      </div>

      <section className="adm-card adm-traffic" aria-labelledby="tr-t" data-testid="traffic">
        <div className="hd">
          <div>
            <h2 id="tr-t">Website traffic</h2>
            <p>{first && `${first.getDate()} ${MON[first.getMonth()]} – ${lastD.getDate()} ${MON[lastD.getMonth()]} ${lastD.getFullYear()}`} · page views per page visited · unique visitors counted per day, without storing IP addresses</p>
          </div>
          <div className="adm-seg" role="group" aria-label="Period">
            {[7, 14, 30].map((d) => <button key={d} type="button" className={days === d ? 'on' : ''} aria-pressed={days === d} onClick={() => setDays(d)}>Last {d} days</button>)}
          </div>
        </div>
        <div className="adm-kpis">
          <div><span>Total page views</span><b>{nf(traffic?.total_views)}</b></div>
          <div><span>Unique visitors</span><b>{nf(traffic?.total_unique_visitors)}</b></div>
          <div><span>Avg. daily views</span><b>{nf(Math.round((traffic?.total_views || 0) / days))}</b></div>
        </div>
        <div className="adm-tr">
          <div className="adm-chart">
            <div className="ch-h"><b>Daily views</b><span className="lg"><span><i />Page views</span><span><i className="d" />Unique visitors</span></span></div>
            <Chart data={data} />
          </div>
          <div className="adm-top">
            <b>Top pages</b>
            {pages.length === 0 ? <p className="adm-none">No visits recorded in this period.</p> : (
              <ul>
                {pages.map(([pg, v]) => (
                  <li key={pg}><span className="r"><span>{pg}</span><span>{nf(v)} views</span></span><span className="bar"><i style={{ width: `${(v / topMax) * 100}%` }} /></span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </AdminPage>
  );
}
