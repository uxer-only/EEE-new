import { useState, Fragment } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { notifyError, notifyProblem } from '../lib/notify';
import { User, FileText, CurrencyDollar, CaretLeft, CaretRight, CaretDown, Plus, X, Check, CheckCircle, Info } from 'phosphor-react';
import { saveAgencyProfile } from '@/services/api';
import SiteHeader from '@/components/SiteHeader';
import ServicesStep from '@/components/onboarding/ServicesStep';
import RatesAvailabilityStep from '@/components/onboarding/RatesAvailabilityStep';
import { COUNTRY_DIAL_CODES, blankRates, defaultSchedule } from '@/constants/companionData';

const STEPS = [
  { id: 1, title: 'Basic info', icon: User },
  { id: 2, title: 'Services', icon: FileText },
  { id: 3, title: 'Rates & availability', icon: CurrencyDollar }
];

const LANG_PRESETS = ['English', 'Dutch', 'French', 'German', 'Russian'];

const MESSAGING = [
  { key: 'hasWhatsapp', label: 'WhatsApp' },
  { key: 'hasTelegram', label: 'Telegram' },
  { key: 'hasSignal', label: 'Signal' },
  { key: 'hasSms', label: 'SMS' },
  { key: 'hasViber', label: 'Viber' },
  { key: 'hasLine', label: 'Line' },
  { key: 'hasWechat', label: 'WeChat' },
];

const COUNTRIES = [
  'Belgium', 'Netherlands', 'Luxembourg', 'France', 'Germany', 'United Kingdom', 'Spain', 'Italy',
  'Portugal', 'Switzerland', 'Austria', 'Ireland', 'Denmark', 'Sweden', 'Norway', 'Finland', 'Poland',
  'Czech Republic', 'Greece', 'Croatia', 'Hungary', 'Romania', 'Bulgaria', 'Slovenia', 'Slovakia',
  'Estonia', 'Latvia', 'Lithuania', 'Cyprus', 'Malta', 'Monaco', 'Andorra', 'United States', 'Canada',
  'Australia', 'New Zealand', 'Brazil', 'Argentina', 'Mexico', 'United Arab Emirates', 'Singapore',
  'Japan', 'South Korea', 'Thailand', 'Other'
];

const CARD = 'bg-white border border-[#ECE8EF] rounded-2xl p-6 md:p-8 shadow-[0_6px_20px_rgba(52,24,60,0.06)]';
const LABEL = 'block text-[13px] font-semibold text-[#1B1820] mb-1';
const INPUT = 'w-full rounded-lg border border-[#898989] bg-white px-4 py-2.5 text-sm text-[#1B1820] focus:border-[#7A2357] focus:outline-none';

export default function AgencyOnboarding({ initial, onDone, initialStep = 1 }) {
  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [newLanguage, setNewLanguage] = useState('');
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [data, setData] = useState(() => ({
    agency_name: initial?.agency_name || '',
    location: { city: initial?.location?.city || '', country: initial?.location?.country || '' },
    description: initial?.description || '',
    languages: initial?.languages || [],
    contact: initial?.contact || {
      phone: '', email: '',
      hasWhatsapp: false, hasTelegram: false, hasSignal: false, hasSms: false,
      hasViber: false, hasLine: false, hasWechat: false,
      telegramId: '', lineId: '', wechatId: ''
    },
    companionshipType: 'escort',
    services: initial?.default_services || {},
    apply_services_to_all: initial?.apply_services_to_all ?? true,
    accepts_disabilities: initial?.accepts_disabilities || false,
    rates: initial?.default_rates || blankRates(),
    apply_rates_to_all: initial?.apply_rates_to_all ?? true,
    schedule: initial?.default_availability?.schedule || defaultSchedule(),
    availability_type: initial?.default_availability?.availability_type || 'both',
    available247: initial?.default_availability?.available247 || false,
    booking_advance: initial?.default_availability?.booking_advance || false
  }));

  const update = (patch) => setData((prev) => ({ ...prev, ...patch }));
  const setContact = (patch) => setData((prev) => ({ ...prev, contact: { ...prev.contact, ...patch } }));

  const current = data.languages || [];
  const customLangs = current.filter((l) => !LANG_PRESETS.includes(l));
  const toggleLang = (lang) => update({ languages: current.includes(lang) ? current.filter((l) => l !== lang) : [...current, lang] });
  const addCustomLang = () => {
    const v = newLanguage.trim();
    if (!v) return;
    if (current.some((l) => l.toLowerCase() === v.toLowerCase())) { setNewLanguage(''); return; }
    update({ languages: [...current, v] });
    setNewLanguage('');
  };

  const canProceedStep1 = data.agency_name.trim() && data.location.city.trim() && data.location.country.trim();

  const handleFinish = async () => {
    setSaving(true);
    try {
      await saveAgencyProfile({
        agency_name: data.agency_name.trim(),
        location: data.location,
        description: data.description,
        languages: data.languages,
        contact: data.contact,
        default_services: data.services,
        apply_services_to_all: data.apply_services_to_all,
        accepts_disabilities: data.accepts_disabilities,
        default_rates: data.rates,
        apply_rates_to_all: data.apply_rates_to_all,
        default_availability: {
          availability_type: data.availability_type,
          schedule: data.schedule,
          available247: data.available247,
          booking_advance: data.booking_advance
        }
      });
      toast.success('Agency set up! Now add your companion profiles.');
      onDone && onDone();
    } catch (e) {
      notifyError(e, "We couldn't save your agency setup.");
      setSaving(false);
    }
  };

  const next = () => {
    if (step === 1 && !canProceedStep1) { notifyProblem('Some agency details are missing.', 'Fill in the agency name, city and country to continue.'); return; }
    setStep((s) => Math.min(3, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => setStep((s) => Math.max(1, s - 1));
  const goToStep = (id) => { setStep(id); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const dial = COUNTRY_DIAL_CODES[data.location.country] || '';
  const rawPhone = data.contact.phone || '';
  const localPhone = dial && rawPhone.startsWith(dial) ? rawPhone.slice(dial.length).replace(/^\s+/, '') : rawPhone;

  const applyBox = (checked, onChange, title, hint, testid) => (
    <button type="button" onClick={() => onChange(!checked)} className="w-full flex items-start gap-3 text-left rounded-xl border border-[#7A2357]/30 bg-[#7A2357]/5 p-4" data-testid={testid}>
      <span className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-[5px] border-2 flex items-center justify-center transition-colors ${checked ? 'bg-[#7A2357] border-[#7A2357]' : 'bg-white border-[#898989]'}`}>
        {checked && <Check size={13} weight="bold" className="text-white" />}
      </span>
      <span>
        <span className="block font-semibold text-[#1B1820]">{title}</span>
        <span className="flex items-start gap-1.5 mt-1 text-sm text-[#5F5966]"><Info size={15} className="text-[#7A2357] mt-0.5 shrink-0" /> {hint}</span>
      </span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F0EFF4] dashboard-light">
      <SiteHeader />
      <div className="pt-32 pb-20 section-padding">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#7A2357] mb-2" data-testid="agency-step-label">
              Step {step} of 3 · {step === 3 ? 'Final step' : 'Agency setup'}
            </p>
            <h2 className="text-[30px] md:text-4xl font-bold text-[#1B1820] leading-tight mb-1">Set up your agency</h2>
            <p className="text-[#5F5966]">These details become the defaults for every companion profile you add.</p>
          </div>

          {/* Stepper */}
          <div className="mb-8 bg-white rounded-2xl shadow-[0_6px_20px_rgba(52,24,60,0.06)] px-5 md:px-7 py-4 overflow-x-auto" data-testid="agency-wizard-steps">
            <div className="flex items-center">
              {STEPS.map((s, index) => {
                const active = step === s.id;
                const done = step > s.id;
                return (
                  <Fragment key={s.id}>
                    <button onClick={() => goToStep(s.id)} className="flex items-center gap-2.5 flex-shrink-0 transition-colors" data-testid={`step-${s.id}`}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold transition-colors ${
                        active ? 'border-2 border-[#7A2357] text-[#7A2357] bg-white'
                        : done ? 'bg-[#7A2357] text-white'
                        : 'bg-[#F5F2F7] text-[#8E8597]'
                      }`}>
                        {done ? <Check size={14} weight="bold" /> : s.id}
                      </span>
                      <span className={`text-[15px] whitespace-nowrap ${active ? 'font-bold text-[#1B1820]' : done ? 'text-[#1B1820]' : 'text-[#5F5966]'}`}>{s.title}</span>
                    </button>
                    {index < STEPS.length - 1 && <div className="flex-1 h-px bg-[#DFDAE4] mx-3 md:mx-5 min-w-[20px]" />}
                  </Fragment>
                );
              })}
            </div>
          </div>

          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={step === 1 || step === 3 ? 'p-0' : CARD}
          >
            {step === 1 && (
              <div className="flex flex-col gap-6">
                {/* Basic information */}
                <div className={CARD}>
                  <h3 className="text-[20px] font-bold text-[#1B1820] mb-5">Basic information</h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className={LABEL}>Agency name</label>
                      <input type="text" value={data.agency_name} onChange={(e) => update({ agency_name: e.target.value })} className={INPUT} placeholder="Your agency name" data-testid="agency-name-input" />
                    </div>
                    <div>
                      <label className={LABEL}>City</label>
                      <input type="text" value={data.location.city} onChange={(e) => update({ location: { ...data.location, city: e.target.value } })} className={INPUT} placeholder="Your city" data-testid="agency-city-input" />
                    </div>
                    <div>
                      <label className={LABEL}>Country</label>
                      <div className="relative">
                        <select value={data.location.country} onChange={(e) => update({ location: { ...data.location, country: e.target.value } })} className={`${INPUT} appearance-none pr-10 cursor-pointer`} data-testid="agency-country-select">
                          <option value="">Select country</option>
                          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <CaretDown size={14} weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8597] pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL}>Agency description</label>
                      <textarea value={data.description} onChange={(e) => update({ description: e.target.value.slice(0, 1500) })} className={`${INPUT} h-32 resize-none`} placeholder="Describe your agency..." maxLength={1500} data-testid="agency-description-input" />
                      <div className="flex justify-end mt-1"><span className="text-xs text-[#8E8597]">{(data.description || '').length}/1500</span></div>
                    </div>
                    <div>
                      <div className="flex items-end justify-between mb-2">
                        <label className={`${LABEL} mb-0`}>Languages</label>
                        <span className="text-xs text-[#8E8597]">{current.length} selected</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {LANG_PRESETS.map((lang) => {
                          const selected = current.includes(lang);
                          return (
                            <button key={lang} type="button" onClick={() => toggleLang(lang)} className={`px-3 py-2 rounded-lg border text-sm transition-colors ${selected ? 'border-[#7A2357] bg-[#7A2357] text-white' : 'border-[#DFDAE4] bg-white text-[#1B1820] hover:border-[#7A2357]'}`} data-testid={`agency-lang-${lang.toLowerCase()}`}>
                              {lang}
                            </button>
                          );
                        })}
                        {customLangs.map((lang) => (
                          <span key={lang} className="relative pl-3 pr-8 py-2 rounded-lg border border-[#7A2357] bg-[#7A2357] text-white text-sm flex items-center">
                            <span className="truncate">{lang}</span>
                            <button type="button" onClick={() => toggleLang(lang)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors" aria-label={`Remove ${lang}`}><X size={14} /></button>
                          </span>
                        ))}
                      </div>
                      {showAddLanguage ? (
                        <div className="mt-3 flex items-center gap-2">
                          <input type="text" value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomLang(); setShowAddLanguage(false); } else if (e.key === 'Escape') { setNewLanguage(''); setShowAddLanguage(false); } }} autoFocus placeholder="e.g. Italian" className={`${INPUT} flex-1`} data-testid="agency-add-language-input" />
                          <button type="button" onClick={() => { addCustomLang(); setShowAddLanguage(false); }} disabled={!newLanguage.trim()} className="px-4 py-2.5 rounded-lg border border-[#7A2357] text-[#7A2357] font-semibold hover:bg-[#7A2357]/5 disabled:opacity-40 transition-colors text-sm whitespace-nowrap" data-testid="agency-add-language-confirm">Add</button>
                          <button type="button" onClick={() => { setNewLanguage(''); setShowAddLanguage(false); }} className="px-3 py-2.5 rounded-lg border border-[#DFDAE4] text-[#1B1820] hover:border-red-400 hover:text-red-400 transition-colors" aria-label="Cancel"><X size={16} /></button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setShowAddLanguage(true)} className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[#DFDAE4] text-[#1B1820] hover:border-[#7A2357] hover:text-[#7A2357] transition-colors text-sm" data-testid="agency-add-language-button">
                          <Plus size={16} /> Add language
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact information */}
                <div className={CARD}>
                  <h3 className="text-[20px] font-bold text-[#1B1820] mb-5">Contact information</h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className={LABEL}>Mobile phone</label>
                      <div className="flex items-stretch rounded-lg border border-[#898989] bg-white overflow-hidden focus-within:border-[#7A2357] transition-colors">
                        {dial && <span className="px-3 py-2.5 text-[#7A2357] text-sm border-r border-[#898989] select-none whitespace-nowrap" data-testid="agency-phone-dial-code">{dial}</span>}
                        <input type="tel" value={localPhone} onChange={(e) => { const nx = e.target.value.replace(/^\+\d+\s?/, ''); setContact({ phone: dial ? `${dial} ${nx}`.trim() : nx }); }} className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none px-4 py-2.5 text-sm text-[#1B1820] placeholder:text-[#8E8597]" placeholder={dial ? 'XXX XX XX XX' : 'Select country first or enter full number'} data-testid="agency-phone-input" />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL}>E-mail</label>
                      <input type="email" value={data.contact.email} onChange={(e) => setContact({ email: e.target.value })} className={INPUT} placeholder="info@agency.com" data-testid="agency-email-input" />
                    </div>
                    <div>
                      <label className={`${LABEL} mb-2`}>Available on</label>
                      <div className="flex flex-wrap gap-2">
                        {MESSAGING.map((m) => {
                          const on = !!data.contact[m.key];
                          return (
                            <button key={m.key} type="button" onClick={() => setContact({ [m.key]: !on })} className={`px-3 py-2 rounded-lg border text-sm transition-colors ${on ? 'border-[#7A2357] bg-[#7A2357] text-white' : 'border-[#DFDAE4] bg-white text-[#1B1820] hover:border-[#7A2357]'}`} data-testid={`agency-contact-${m.label.toLowerCase()}`}>
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                      {(data.contact.hasTelegram || data.contact.hasLine || data.contact.hasWechat) && (
                        <div className="mt-4 flex flex-col gap-4">
                          {data.contact.hasTelegram && (
                            <div>
                              <label className={LABEL} htmlFor="agency-telegram-id">Telegram ID</label>
                              <input id="agency-telegram-id" type="text" value={data.contact.telegramId || ''} onChange={(e) => setContact({ telegramId: e.target.value })} className={INPUT} placeholder="@username" data-testid="agency-telegram-id-input" />
                            </div>
                          )}
                          {data.contact.hasLine && (
                            <div>
                              <label className={LABEL} htmlFor="agency-line-id">Line ID</label>
                              <input id="agency-line-id" type="text" value={data.contact.lineId || ''} onChange={(e) => setContact({ lineId: e.target.value })} className={INPUT} placeholder="your-line-id" data-testid="agency-line-id-input" />
                            </div>
                          )}
                          {data.contact.hasWechat && (
                            <div>
                              <label className={LABEL} htmlFor="agency-wechat-id">WeChat ID</label>
                              <input id="agency-wechat-id" type="text" value={data.contact.wechatId || ''} onChange={(e) => setContact({ wechatId: e.target.value })} className={INPUT} placeholder="your-wechat-id" data-testid="agency-wechat-id-input" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6">
                <ServicesStep data={data} update={update} showDisabilities={false} />
                {applyBox(data.apply_services_to_all, (v) => update({ apply_services_to_all: v }), 'Apply these services to all profiles', 'You can also set services individually in each profile itself.', 'apply-services-to-all')}
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-6">
                <RatesAvailabilityStep data={data} update={update} />
                {applyBox(data.apply_rates_to_all, (v) => update({ apply_rates_to_all: v }), 'Apply these rates & availability to all profiles', 'You can also set rates & availability individually in each profile itself.', 'apply-rates-to-all')}
              </div>
            )}
          </motion.div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 mt-6">
            {step > 1 ? (
              <button onClick={back} className="px-5 py-2.5 rounded-lg border border-[#DFDAE4] bg-white text-sm font-semibold text-[#1B1820] hover:border-[#7A2357] hover:text-[#7A2357] transition-colors flex items-center gap-2" data-testid="agency-wizard-back">
                <CaretLeft size={16} /> Back
              </button>
            ) : <span />}
            <span className="hidden sm:block text-sm text-[#8E8597]">Step {step} of 3</span>
            {step < 3 ? (
              <button onClick={next} className="btn-primary flex items-center gap-2" data-testid="agency-wizard-next">
                Save &amp; continue <CaretRight size={16} />
              </button>
            ) : (
              <button onClick={handleFinish} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50" data-testid="agency-wizard-finish">
                {saving ? 'Saving…' : (<>Finish setup <Check size={16} weight="bold" /></>)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
