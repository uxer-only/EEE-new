import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { User, FileText, CurrencyDollar, CaretLeft, CaretRight, Plus, X, Check, CheckCircle, Info } from 'phosphor-react';
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

const LANG_PRESETS = ['English', 'French', 'German', 'Russian'];

const COUNTRIES = [
  'Belgium', 'Netherlands', 'Luxembourg', 'France', 'Germany', 'United Kingdom', 'Spain', 'Italy',
  'Portugal', 'Switzerland', 'Austria', 'Ireland', 'Denmark', 'Sweden', 'Norway', 'Finland', 'Poland',
  'Czech Republic', 'Greece', 'Croatia', 'Hungary', 'Romania', 'Bulgaria', 'Slovenia', 'Slovakia',
  'Estonia', 'Latvia', 'Lithuania', 'Cyprus', 'Malta', 'Monaco', 'Andorra', 'United States', 'Canada',
  'Australia', 'New Zealand', 'Brazil', 'Argentina', 'Mexico', 'United Arab Emirates', 'Singapore',
  'Japan', 'South Korea', 'Thailand', 'Other'
];

export default function AgencyOnboarding({ initial, onDone }) {
  const [step, setStep] = useState(1);
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
    default_services: initial?.default_services || {},
    apply_services_to_all: initial?.apply_services_to_all ?? true,
    default_rates: initial?.default_rates || blankRates(),
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
        default_services: data.default_services,
        apply_services_to_all: data.apply_services_to_all,
        default_rates: data.default_rates,
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
      toast.error(e?.response?.data?.detail || 'Could not save agency setup');
      setSaving(false);
    }
  };

  const next = () => {
    if (step === 1 && !canProceedStep1) { toast.error('Please fill agency name, city and country'); return; }
    setStep((s) => Math.min(3, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const dial = COUNTRY_DIAL_CODES[data.location.country] || '';
  const rawPhone = data.contact.phone || '';
  const localPhone = dial && rawPhone.startsWith(dial) ? rawPhone.slice(dial.length).replace(/^\s+/, '') : rawPhone;

  return (
    <div className="min-h-screen bg-[#F0EFF4] dashboard-light">
      <SiteHeader />
      <div className="pt-32 pb-20 section-padding">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#832161] mb-3">Agency setup</p>
            <h2 className="text-4xl text-[#000000] mb-3">Set up your agency</h2>
            <p className="text-[#898989]">These details become the defaults for every companion profile you add.</p>
          </div>

          {/* Progress Steps — same UI as the independent flow */}
          <div className="flex items-center justify-between mb-10 px-4" data-testid="agency-wizard-steps">
            {STEPS.map((s, index) => {
              const Icon = s.icon;
              const active = step === s.id;
              const done = step > s.id;
              const textCls = active ? 'text-[#832161]' : done ? 'text-green-600' : 'text-[#000000]';
              const borderCls = active ? 'border-[#832161] bg-white' : done ? 'border-green-600 bg-white' : 'border-[#dbdadd] bg-white';
              return (
                <div key={s.id} className="flex items-center">
                  <div className={`flex flex-col items-center gap-2 transition-all ${textCls}`} data-testid={`step-${s.id}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${borderCls}`}>
                      {done ? <CheckCircle size={24} weight="fill" /> : <Icon size={24} />}
                    </div>
                    <span className="text-xs uppercase tracking-wider hidden md:block">{s.title}</span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-8 md:w-16 h-0.5 mx-2 ${done ? 'bg-green-600' : 'bg-[#dbdadd]'}`} />
                  )}
                </div>
              );
            })}
          </div>

          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={step === 1 ? '' : 'bg-white border border-[#dbdadd] rounded-lg p-6 md:p-8'}
          >
            {step === 1 && (
              <div className="space-y-8">
                {/* Box 1: Basic Information */}
                <div className="bg-white border border-[#dbdadd] rounded-lg p-6">
                  <h3 className="text-2xl font-bold text-[#832161] mb-6">Basic Information</h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="input-label">Agency name</label>
                      <input
                        type="text"
                        value={data.agency_name}
                        onChange={(e) => update({ agency_name: e.target.value })}
                        className="input-premium w-full"
                        placeholder="Your agency name"
                        data-testid="agency-name-input"
                      />
                    </div>
                    <div>
                      <label className="input-label">City</label>
                      <input
                        type="text"
                        value={data.location.city}
                        onChange={(e) => update({ location: { ...data.location, city: e.target.value } })}
                        className="input-premium w-full"
                        placeholder="Your city"
                        data-testid="agency-city-input"
                      />
                    </div>
                    <div>
                      <label className="input-label">Country</label>
                      <select
                        value={data.location.country}
                        onChange={(e) => update({ location: { ...data.location, country: e.target.value } })}
                        className="input-premium w-full"
                        data-testid="agency-country-select"
                      >
                        <option value="">Select country</option>
                        {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Describe agency */}
                  <div className="mt-8 pt-8 border-t border-[#dbdadd]">
                    <label className="input-label">Agency description</label>
                    <textarea
                      value={data.description}
                      onChange={(e) => update({ description: e.target.value.slice(0, 1500) })}
                      className="input-premium w-full h-32 resize-none"
                      placeholder="Describe your agency..."
                      maxLength={1500}
                      data-testid="agency-description-input"
                    />
                    <div className="flex justify-end mt-2"><span className="text-xs text-[#000000]">{(data.description || '').length}/1500</span></div>
                  </div>

                  {/* Languages */}
                  <div className="mt-8 pt-8 border-t border-[#dbdadd]">
                    <div className="flex items-end justify-between mb-3">
                      <label className="input-label !mb-0">Languages</label>
                      <span className="text-xs text-[#000000]">{current.length} selected</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {LANG_PRESETS.map((lang) => {
                        const selected = current.includes(lang);
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => toggleLang(lang)}
                            className={`py-2.5 px-3 border text-sm uppercase tracking-wider transition-all ${
                              selected ? 'border-[#832161] text-[#832161]' : 'border-[#898989] text-[#898989] hover:border-[#832161]'
                            }`}
                            data-testid={`agency-lang-${lang.toLowerCase()}`}
                          >
                            {lang}
                          </button>
                        );
                      })}
                      {customLangs.map((lang) => (
                        <div key={lang} className="relative py-2.5 pl-3 pr-8 border border-[#832161] text-[#832161] text-sm uppercase tracking-wider flex items-center">
                          <span className="truncate">{lang}</span>
                          <button type="button" onClick={() => toggleLang(lang)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#832161] hover:text-red-400 transition-colors" aria-label={`Remove ${lang}`}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add language CTA → reveals input */}
                    {showAddLanguage ? (
                      <div className="mt-4 flex items-center gap-2">
                        <input
                          type="text"
                          value={newLanguage}
                          onChange={(e) => setNewLanguage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); addCustomLang(); setShowAddLanguage(false); }
                            else if (e.key === 'Escape') { setNewLanguage(''); setShowAddLanguage(false); }
                          }}
                          autoFocus
                          placeholder="e.g. Italian"
                          className="input-premium flex-1"
                          data-testid="agency-add-language-input"
                        />
                        <button type="button" onClick={() => { addCustomLang(); setShowAddLanguage(false); }} disabled={!newLanguage.trim()} className="px-4 py-3 border border-[#832161] text-[#832161] hover:bg-[#832161]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm uppercase tracking-wider whitespace-nowrap" data-testid="agency-add-language-confirm">
                          Add
                        </button>
                        <button type="button" onClick={() => { setNewLanguage(''); setShowAddLanguage(false); }} className="px-3 py-3 border border-[#dbdadd] text-[#000000] hover:border-red-400 hover:text-red-400 transition-colors" aria-label="Cancel">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowAddLanguage(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-3 border border-dashed border-[#dbdadd] text-[#000000] hover:border-[#832161] hover:text-[#DA4167] transition-colors text-sm uppercase tracking-wider" data-testid="agency-add-language-button">
                        <Plus size={16} /> Add language
                      </button>
                    )}
                  </div>
                </div>

                {/* Box 2: Contact Information */}
                <div className="bg-white border border-[#dbdadd] rounded-lg p-6">
                  <h3 className="text-2xl font-bold text-[#832161] mb-6">Contact information</h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="input-label">Mobile phone</label>
                      <div className="flex items-stretch border border-[#898989] focus-within:border-[#DA4167] transition-colors">
                        {dial && <span className="px-3 py-3 bg-white text-[#832161] text-[13px] border-r border-[#898989] select-none whitespace-nowrap" data-testid="agency-phone-dial-code">{dial}</span>}
                        <input
                          type="tel"
                          value={localPhone}
                          onChange={(e) => {
                            const nx = e.target.value.replace(/^\+\d+\s?/, '');
                            setContact({ phone: dial ? `${dial} ${nx}`.trim() : nx });
                          }}
                          className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none px-4 py-3 text-[13px] text-[#000000] placeholder:text-[#000000] placeholder:italic"
                          placeholder={dial ? 'XXX XX XX XX' : 'Select country first or enter full number'}
                          data-testid="agency-phone-input"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="input-label">E-mail</label>
                      <input
                        type="email"
                        value={data.contact.email}
                        onChange={(e) => setContact({ email: e.target.value })}
                        className="input-premium w-full"
                        placeholder="info@agency.com"
                        data-testid="agency-email-input"
                      />
                    </div>

                    <div>
                      <label className="input-label mb-4">Available on</label>
                      <div className="flex gap-6 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={data.contact.hasWhatsapp || false} onChange={(e) => setContact({ hasWhatsapp: e.target.checked })} className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#25D366] checked:border-[#25D366]" data-testid="agency-contact-whatsapp" />
                          <span className="text-[#000000]">WhatsApp</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={data.contact.hasTelegram || false} onChange={(e) => setContact({ hasTelegram: e.target.checked })} className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#0088cc] checked:border-[#0088cc]" data-testid="agency-contact-telegram" />
                          <span className="text-[#000000]">Telegram</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={data.contact.hasSignal || false} onChange={(e) => setContact({ hasSignal: e.target.checked })} className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#3A76F0] checked:border-[#3A76F0]" data-testid="agency-contact-signal" />
                          <span className="text-[#000000]">Signal</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={data.contact.hasSms || false} onChange={(e) => setContact({ hasSms: e.target.checked })} className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#832161] checked:border-[#832161]" data-testid="agency-contact-sms" />
                          <span className="text-[#000000]">SMS</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={data.contact.hasViber || false} onChange={(e) => setContact({ hasViber: e.target.checked })} className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#7360F2] checked:border-[#7360F2]" data-testid="agency-contact-viber" />
                          <span className="text-[#000000]">Viber</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={data.contact.hasLine || false} onChange={(e) => setContact({ hasLine: e.target.checked })} className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#00C300] checked:border-[#00C300]" data-testid="agency-contact-line" />
                          <span className="text-[#000000]">Line</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={data.contact.hasWechat || false} onChange={(e) => setContact({ hasWechat: e.target.checked })} className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#09B83E] checked:border-[#09B83E]" data-testid="agency-contact-wechat" />
                          <span className="text-[#000000]">WeChat</span>
                        </label>
                      </div>

                      {/* ID inputs for username-based platforms */}
                      {(data.contact.hasTelegram || data.contact.hasLine || data.contact.hasWechat) && (
                        <div className="mt-4 flex flex-col gap-4">
                          {data.contact.hasTelegram && (
                            <div>
                              <label className="input-label" htmlFor="agency-telegram-id">Telegram ID</label>
                              <input id="agency-telegram-id" type="text" value={data.contact.telegramId || ''} onChange={(e) => setContact({ telegramId: e.target.value })} className="input-premium w-full" placeholder="@username" data-testid="agency-telegram-id-input" />
                            </div>
                          )}
                          {data.contact.hasLine && (
                            <div>
                              <label className="input-label" htmlFor="agency-line-id">Line ID</label>
                              <input id="agency-line-id" type="text" value={data.contact.lineId || ''} onChange={(e) => setContact({ lineId: e.target.value })} className="input-premium w-full" placeholder="your-line-id" data-testid="agency-line-id-input" />
                            </div>
                          )}
                          {data.contact.hasWechat && (
                            <div>
                              <label className="input-label" htmlFor="agency-wechat-id">WeChat ID</label>
                              <input id="agency-wechat-id" type="text" value={data.contact.wechatId || ''} onChange={(e) => setContact({ wechatId: e.target.value })} className="input-premium w-full" placeholder="your-wechat-id" data-testid="agency-wechat-id-input" />
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
              <div className="space-y-6">
                <ServicesStep data={data} update={update} />
                <div className="rounded-lg border border-[#832161]/30 bg-[#832161]/5 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.apply_services_to_all}
                      onChange={(e) => update({ apply_services_to_all: e.target.checked })}
                      className="mt-0.5 w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#832161] checked:border-[#832161]"
                      data-testid="apply-services-to-all"
                    />
                    <span className="text-[#000000] font-medium">Apply these services to all profiles</span>
                  </label>
                  <div className="flex items-start gap-2 mt-2 pl-8">
                    <Info size={15} className="text-[#832161] mt-0.5 shrink-0" />
                    <p className="text-sm text-[#898989]">You can also set services individually in each profile itself.</p>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <RatesAvailabilityStep data={data} update={update} />
            )}

            {/* Nav */}
            <div className={`flex ${step === 1 ? 'justify-end' : 'justify-between'} mt-8 pt-6 ${step === 1 ? '' : 'border-t border-[#dbdadd]'}`}>
              {step > 1 && (
                <button onClick={back} className="btn-secondary flex items-center gap-2" data-testid="agency-wizard-back">
                  <CaretLeft size={16} /> Back
                </button>
              )}
              {step < 3 ? (
                <button onClick={next} className="btn-primary flex items-center gap-2" data-testid="agency-wizard-next">
                  Continue <CaretRight size={16} />
                </button>
              ) : (
                <button onClick={handleFinish} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50" data-testid="agency-wizard-finish">
                  {saving ? 'Saving…' : (<>Finish setup <Check size={16} weight="bold" /></>)}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
