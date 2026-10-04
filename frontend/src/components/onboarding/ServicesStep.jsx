import { useState } from 'react';
import { Plus, CaretDown, CaretRight, Check, Wheelchair, X } from 'phosphor-react';
import { SERVICE_CATEGORIES, ALL_CATALOG_SERVICES } from '@/constants/companionData';

/**
 * Services picker — categorised accordion with per-service pricing.
 * Props:
 *  - data: { services: object, companionshipType: string, accepts_disabilities: bool }
 *  - update: (patch) => void   // merges top-level keys into parent state
 *  - showCompanionshipType: bool (default true)
 *  - showDisabilities: bool (default true)
 */
export const ServicesStep = ({ data, update, showCompanionshipType = true, showDisabilities = true }) => {
  const [newService, setNewService] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [openCats, setOpenCats] = useState({ massage: true });

  const services = data.services || {};
  const isSel = (name) => !!services[name]?.type;
  const typeOf = (name) => services[name]?.type || null;
  const priceOf = (name) => services[name]?.price || '';

  const setServices = (next) => update({ services: next });
  const toggleSel = (name) => {
    if (isSel(name)) setServices({ ...services, [name]: { type: null, price: '' } });
    else setServices({ ...services, [name]: { type: 'inclusive', price: '' } });
  };
  const setType = (name, t) => setServices({ ...services, [name]: { type: t, price: t === 'extra' ? priceOf(name) : '' } });
  const setPrice = (name, p) => setServices({ ...services, [name]: { ...services[name], price: p.replace(/[^0-9]/g, '') } });

  const catalogSelected = ALL_CATALOG_SERVICES.filter(isSel).length;
  const customServices = Object.keys(services).filter((k) => !ALL_CATALOG_SERVICES.includes(k) && services[k]?.type);

  const addCustom = () => {
    const v = newService.trim();
    if (!v) return;
    setServices({ ...services, [v]: { type: 'inclusive', price: '' } });
    setNewService('');
  };
  const removeCustom = (name) => {
    const next = { ...services };
    delete next[name];
    setServices(next);
  };

  // Companionship: Escort / Erotic massage (one or both) stored as string
  const ct = data.companionshipType || '';
  const escortOn = ct === 'escort' || ct === 'both';
  const massageOn = ct === 'erotic-massage' || ct === 'both';
  const setCompanion = (e, m) => update({ companionshipType: e && m ? 'both' : e ? 'escort' : m ? 'erotic-massage' : '' });

  const checkbox = (on) => (
    <span className={`flex-shrink-0 w-5 h-5 rounded-[5px] border-2 flex items-center justify-center transition-colors ${on ? 'bg-[#7A2357] border-[#7A2357]' : 'bg-white border-[#898989]'}`}>
      {on && <Check size={13} weight="bold" className="text-white" />}
    </span>
  );

  const pricingToggle = (name) => {
    const enabled = isSel(name);
    const t = typeOf(name);
    const seg = (active) => `px-3 py-1.5 rounded-md text-sm transition-colors ${active ? 'bg-[#EBE0EA] text-[#7A2357] font-semibold' : enabled ? 'text-[#5F5966] hover:text-[#7A2357]' : 'text-[#C9C3CE] cursor-not-allowed'}`;
    return (
      <div className={`inline-flex rounded-lg border p-0.5 ${enabled ? 'border-[#DFDAE4]' : 'border-[#ECE8EF]'}`}>
        <button type="button" disabled={!enabled} onClick={() => setType(name, 'inclusive')} className={seg(t === 'inclusive')} data-testid={`pricing-included-${name}`}>Included</button>
        <button type="button" disabled={!enabled} onClick={() => setType(name, 'extra')} className={seg(t === 'extra')} data-testid={`pricing-extra-${name}`}>Extra</button>
      </div>
    );
  };

  const serviceRow = (name) => {
    const sel = isSel(name);
    return (
      <div key={name} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_130px] gap-3 sm:gap-6 items-center px-5 py-3 border-t border-[#F1ECF1]">
        <button type="button" onClick={() => toggleSel(name)} className="flex items-center gap-3 text-left" data-testid={`service-toggle-${name}`}>
          {checkbox(sel)}
          <span className="text-[15px] text-[#1B1820]">{name}</span>
        </button>
        <div>{pricingToggle(name)}</div>
        <div className="sm:text-right">
          {sel && typeOf(name) === 'extra' ? (
            <div className="relative inline-block w-[110px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8E8597]">€</span>
              <input
                type="text"
                inputMode="numeric"
                value={priceOf(name)}
                onChange={(e) => setPrice(name, e.target.value)}
                className="w-full border border-[#898989] rounded-lg pl-7 pr-2 py-2 text-sm text-[#1B1820] focus:border-[#7A2357] focus:ring-0 focus:outline-none"
                placeholder="40"
                data-testid={`extra-cost-${name}`}
              />
            </div>
          ) : (
            <span className="text-sm text-[#8E8597]">In your rate</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-[24px] md:text-[28px] font-bold text-[#1B1820] mb-1">Services</h3>
        <p className="text-sm text-[#5F5966]">Tick what you offer. For each one, say whether it's included in your rate or costs extra.</p>
      </div>

      {/* Type of companionship */}
      {showCompanionshipType && (
        <div>
          <p className="text-[13px] font-semibold text-[#1B1820] mb-3">
            Type of companionship <span className="font-normal text-[#8E8597]">· choose one or both</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setCompanion(!escortOn, massageOn)}
              className={`flex items-start gap-3 text-left rounded-xl border p-5 transition-colors ${escortOn ? 'border-[#7A2357] bg-[#7A2357]/5' : 'border-[#DFDAE4] bg-white hover:border-[#7A2357]'}`}
              data-testid="companionship-escort"
            >
              {checkbox(escortOn)}
              <span>
                <span className="block font-semibold text-[#1B1820]">Escort</span>
                <span className="block text-sm text-[#5F5966]">Dates and companionship, at your place or theirs.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCompanion(escortOn, !massageOn)}
              className={`flex items-start gap-3 text-left rounded-xl border p-5 transition-colors ${massageOn ? 'border-[#7A2357] bg-[#7A2357]/5' : 'border-[#DFDAE4] bg-white hover:border-[#7A2357]'}`}
              data-testid="companionship-massage"
            >
              {checkbox(massageOn)}
              <span>
                <span className="block font-semibold text-[#1B1820]">Erotic massage</span>
                <span className="block text-sm text-[#5F5966]">Massage-focused sessions.</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Accepts disabilities */}
      {showDisabilities && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F7F5F9] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-white text-[#7A2357]"><Wheelchair size={22} weight="fill" /></span>
            <div>
              <div className="font-semibold text-[#1B1820]">Welcoming to clients with disabilities</div>
              <div className="text-sm text-[#5F5966]">Shows an accessibility badge on your profile.</div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!data.accepts_disabilities}
            onClick={() => update({ accepts_disabilities: !data.accepts_disabilities })}
            className={`flex-shrink-0 w-12 h-7 rounded-full p-0.5 transition-colors ${data.accepts_disabilities ? 'bg-[#7A2357]' : 'bg-[#D8D2DC]'}`}
            data-testid="accepts-disabilities-checkbox"
          >
            <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${data.accepts_disabilities ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      )}

      {/* What you offer */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h4 className="text-lg font-bold text-[#1B1820]">What you offer</h4>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#7A2357]" data-testid="services-selected-count">{catalogSelected} of {ALL_CATALOG_SERVICES.length} selected</span>
            <button
              type="button"
              onClick={() => setSelectedOnly((v) => !v)}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${selectedOnly ? 'border-[#7A2357] bg-[#7A2357]/5 text-[#7A2357]' : 'border-[#DFDAE4] bg-white text-[#1B1820] hover:border-[#7A2357]'}`}
              data-testid="selected-only-toggle"
            >
              Selected only
            </button>
          </div>
        </div>
        <p className="text-sm text-[#5F5966] mb-4">Tick the services you offer. Unticked services are not shown on your profile.</p>

        <div className="flex flex-col gap-2">
          {SERVICE_CATEGORIES.map((cat) => {
            const selCount = cat.services.filter(isSel).length;
            if (selectedOnly && selCount === 0) return null;
            const open = selectedOnly || openCats[cat.id];
            const rows = selectedOnly ? cat.services.filter(isSel) : cat.services;
            return (
              <div key={cat.id} className="rounded-xl border border-[#ECE8EF] overflow-hidden" data-testid={`service-category-${cat.id}`}>
                <button
                  type="button"
                  onClick={() => setOpenCats((o) => ({ ...o, [cat.id]: !o[cat.id] }))}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-[#F7F5F9] hover:bg-[#F1ECF1] transition-colors"
                  data-testid={`service-category-header-${cat.id}`}
                >
                  <span className="flex items-center gap-3 font-bold text-[#1B1820]">
                    {open ? <CaretDown size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
                    {cat.label}
                  </span>
                  <span className={`text-sm font-semibold ${selCount > 0 ? 'text-[#7A2357]' : 'text-[#8E8597]'}`}>
                    {selCount > 0 ? `${selCount} of ${cat.services.length} selected` : `${cat.services.length} services`}
                  </span>
                </button>
                {open && (
                  <div className="bg-white">
                    <div className="hidden sm:grid grid-cols-[1fr_auto_130px] gap-6 px-5 py-2 border-t border-[#F1ECF1] text-[11px] font-semibold uppercase tracking-wider text-[#8E8597]">
                      <span>Service</span>
                      <span>Pricing</span>
                      <span className="text-right">Extra cost</span>
                    </div>
                    {rows.map((name) => serviceRow(name))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom services */}
        <div className="mt-6">
          <label className="block text-[13px] font-semibold text-[#1B1820] mb-2">Missing something? Add your own service</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              className="flex-1 bg-white border border-[#898989] rounded-lg px-4 py-3 text-[15px] text-[#1B1820] placeholder:text-[#BDB4C5] focus:border-[#7A2357] focus:ring-0 focus:outline-none"
              placeholder="e.g. Dinner date"
              data-testid="custom-service-input"
            />
            <button type="button" onClick={addCustom} className="flex items-center gap-2 px-5 rounded-lg border border-[#7A2357] text-[#7A2357] font-semibold hover:bg-[#7A2357]/5 transition-colors" data-testid="add-service-button">
              <Plus size={16} weight="bold" /> Add
            </button>
          </div>
          {customServices.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3" data-testid="custom-services-list">
              {customServices.map((name) => (
                <span key={name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-[#7A2357]/5 border border-[#7A2357] text-[#7A2357]">
                  {name}
                  <button type="button" onClick={() => removeCustom(name)} aria-label={`Remove ${name}`} className="hover:text-red-500"><X size={13} weight="bold" /></button>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-[#8E8597] mt-2">Custom services are checked by our team before they appear on your profile.</p>
        </div>
      </div>
    </div>
  );
};

export default ServicesStep;
