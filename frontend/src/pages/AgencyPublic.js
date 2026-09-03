import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, CheckCircle, Crown, Users } from 'phosphor-react';
import { getAgencyPublic } from '@/services/api';
import SiteHeader from '@/components/SiteHeader';

export default function AgencyPublic() {
  const { agencyId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAgencyPublic(agencyId)
      .then((r) => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [agencyId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0EFF4] dashboard-light flex items-center justify-center">
        <div className="shimmer w-14 h-14 rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F0EFF4] dashboard-light">
        <SiteHeader />
        <div className="pt-40 text-center">
          <h1 className="text-2xl text-[#000000] mb-2">Agency not found</h1>
          <Link to="/browse" className="text-[#DA4167] hover:opacity-80">Browse companions</Link>
        </div>
      </div>
    );
  }

  const { agency_name, description, location, languages, companions } = data;

  return (
    <div className="min-h-screen bg-[#F0EFF4] dashboard-light">
      <SiteHeader />
      <div className="pt-32 pb-20 section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Agency hero */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-12" data-testid="agency-public-header">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#832161]/10 text-[#832161] text-xs uppercase tracking-[0.2em] mb-4">
              <Users size={14} /> Agency
            </div>
            <h1 className="text-4xl md:text-6xl font-playfair text-[#000000] mb-4">{agency_name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#898989] mb-4">
              {(location?.city || location?.country) && (
                <span className="inline-flex items-center gap-1"><MapPin size={15} className="text-[#832161]" />{[location?.city, location?.country].filter(Boolean).join(', ')}</span>
              )}
              {languages?.length > 0 && <span>{languages.join(' · ')}</span>}
              <span>{companions.length} companion{companions.length === 1 ? '' : 's'}</span>
            </div>
            {description && <p className="text-[#000000] max-w-3xl leading-relaxed">{description}</p>}
          </motion.div>

          {/* Companions */}
          {companions.length === 0 ? (
            <div className="rounded-lg border border-[#dbdadd] bg-white p-12 text-center" data-testid="agency-public-empty">
              <p className="text-[#898989]">No companions are live right now. Please check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5" data-testid="agency-public-companions">
              {companions.map((c) => (
                <Link
                  key={c.provider_id}
                  to={`/providers/${c.provider_id}`}
                  className="group rounded-lg overflow-hidden bg-white border border-[#dbdadd] hover:shadow-lg transition-shadow"
                  data-testid={`agency-companion-${c.provider_id}`}
                >
                  <div className="relative aspect-[3/4] bg-[#e8e6ec] overflow-hidden">
                    {c.photo ? (
                      <img src={c.photo} alt={c.display_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#c9c6d0]"><Users size={40} /></div>
                    )}
                    {c.vip_active && (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-[#832161] text-white">
                        <Crown size={11} weight="fill" /> VIP
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-medium text-[#000000] truncate">{c.display_name}{c.age ? `, ${c.age}` : ''}</h3>
                      {c.verified && <CheckCircle size={14} weight="fill" className="text-[#22C55E] shrink-0" />}
                    </div>
                    <p className="text-xs text-[#898989] flex items-center gap-1 mt-0.5"><MapPin size={11} />{c.location?.city || '—'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
