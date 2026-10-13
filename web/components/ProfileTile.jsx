import Link from 'next/link';
import { Icon } from '@/components/icons';
import { isVip } from '@/lib/vip';

const TINTS = [
  ['#7A5468', '#3C2733', '#B58AA0'], ['#5E5476', '#2E2840', '#9A8DBA'], ['#4E6A5E', '#24332D', '#88AE9C'],
  ['#7A6048', '#3A2C20', '#C2A07C'], ['#74505C', '#36242B', '#B07F90'], ['#525A78', '#262A3C', '#8E98BC'],
];

/** Profile photo tile used on Home and Browse. */
export default function ProfileTile({ provider, index = 0, testId }) {
  const t = TINTS[index % TINTS.length];
  const photo = provider.photos?.[0];
  const city = provider.location?.city;
  const meta = [provider.age, city].filter(Boolean).join(' · ');
  const vip = isVip(provider);
  return (
    <Link
      href={`/providers/${provider.provider_id}`}
      prefetch={false}
      className="x-tile"
      data-testid={testId}
      aria-label={`${provider.display_name}${meta ? ', ' + meta : ''}${provider.verified ? ', verified' : ''}${vip ? ', VIP' : ''}`}
    >
      <div className="ph" style={photo ? undefined : { background: `linear-gradient(180deg, ${t[0]} 0%, ${t[1]} 100%)` }}>
        {photo ? (
          <img src={photo} alt="" loading={index < 6 ? 'eager' : 'lazy'} />
        ) : (
          <svg className="fig" viewBox="0 0 120 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><circle cx="60" cy="66" r="22" fill={t[2]} /><path d="M18 160c0-38 18-58 42-58s42 20 42 58z" fill={t[2]} /></svg>
        )}
        {vip && <span className="x-vip"><Icon.crown />VIP</span>}
        <div className="bar">
          <div className="nm"><span>{provider.display_name}</span>{provider.verified && <Icon.verified />}</div>
          {meta && <div className="mt">{meta}</div>}
        </div>
      </div>
    </Link>
  );
}
