import { MapPin, CaretDown, EnvelopeSimple, Check, Plus, X } from 'phosphor-react';
import CharacteristicsForm from '@/components/CharacteristicsForm';
import { splitPhone, joinPhone, DIAL_CODE_OPTIONS } from '@/constants/companionData';

const COUNTRIES = [
  'Belgium', 'Netherlands', 'Luxembourg', 'France', 'Germany', 'United Kingdom',
  'Spain', 'Italy', 'Portugal', 'Switzerland', 'Austria', 'Ireland', 'Denmark',
  'Sweden', 'Norway', 'Finland', 'Poland', 'Czech Republic', 'Greece', 'Croatia',
  'Hungary', 'Romania', 'Bulgaria', 'Slovenia', 'Slovakia', 'Estonia', 'Latvia',
  'Lithuania', 'Cyprus', 'Malta', 'Monaco', 'Andorra', 'United States', 'Canada',
  'Australia', 'New Zealand', 'Brazil', 'Argentina', 'Mexico',
  'United Arab Emirates', 'Singapore', 'Japan', 'South Korea', 'Thailand', 'Other'
];

const LANGUAGE_PRESETS = ['English', 'Dutch', 'French', 'German', 'Russian'];

const MESSAGING_APPS = [
  { key: 'hasWhatsapp', label: 'WhatsApp' },
  { key: 'hasTelegram', label: 'Telegram' },
  { key: 'hasSignal', label: 'Signal' },
  { key: 'hasSms', label: 'SMS' },
  { key: 'hasViber', label: 'Viber' },
  { key: 'hasLine', label: 'Line' },
  { key: 'hasWechat', label: 'WeChat' },
];

const inputCls =
  'w-full bg-white border border-[#898989] rounded-lg px-4 py-3 text-[15px] text-[#1B1820] placeholder:text-[#BDB4C5] focus:border-[#7A2357] focus:ring-0 focus:outline-none focus:shadow-[0_0_0_3px_rgba(122,35,87,0.14)] transition-all';

const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-[#1B1820] mb-1">{children}</label>
);

const Card = ({ title, subtitle, tag, children, testId }) => (
  <div className="bg-white border border-[#ECE8EF] rounded-2xl p-6 md:p-8 shadow-[0_6px_20px_rgba(52,24,60,0.06)]" data-testid={testId}>
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <h3 className="text-[24px] md:text-[28px] font-bold text-[#1B1820] leading-tight">{title}</h3>
        {tag && (
          <span className="uppercase tracking-wider text-[10px] font-semibold text-[#8E8597] border border-[#e3e1e6] rounded px-2 py-0.5">{tag}</span>
        )}
      </div>
      {subtitle && <p className="text-sm text-[#5F5966] mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// Segmented control on a light track: selected = wine filled, unselected = plain text
const PillToggle = ({ options, value, onChange, testId, idKey = (o) => o.toLowerCase() }) => (
  <div className="inline-flex flex-wrap bg-[#EBE0EA] rounded-lg p-1 gap-1" data-testid={testId}>
    {options.map((opt) => {
      const v = typeof opt === 'string' ? opt : opt.value;
      const label = typeof opt === 'string' ? opt : opt.label;
      const active = value === v;
      return (
        <button
          key={v}
          type="button"
          onClick={() => onChange(active ? '' : v)}
          className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
            active ? 'bg-[#7A2357] text-white' : 'text-[#5F5966] hover:text-[#7A2357]'
          }`}
          data-testid={`${testId}-${idKey(v)}`}
        >
          {label}
        </button>
      );
    })}
  </div>
);

export default function BasicInfoStep({
  profileData,
  setProfileData,
  isAgencyScoped,
  newLanguage,
  setNewLanguage,
  showAddLanguage,
  setShowAddLanguage,
  countryDialCodes = {},
}) {
  const isAgency = profileData.account_type === 'agency';
  const bioLen = (profileData.bio || '').length;
  const nameLen = (profileData.display_name || '').length;
  const languages = profileData.characteristics?.languages || [];
  const customLangs = languages.filter((l) => !LANGUAGE_PRESETS.includes(l));

  const setContact = (patch) => setProfileData({ ...profileData, contact: { ...profileData.contact, ...patch } });

  const handleCountryChange = (newCountry) => {
    const newDial = countryDialCodes[newCountry] || '';
    const oldDial = countryDialCodes[profileData.location.country] || '';
    const { number } = splitPhone(profileData.contact?.phone, oldDial);
    setProfileData({
      ...profileData,
      location: { ...profileData.location, country: newCountry },
      contact: { ...profileData.contact, phone: newDial ? joinPhone(newDial, number) : (profileData.contact?.phone || '') },
    });
  };

  const toggleLang = (lang) => {
    const next = languages.includes(lang) ? languages.filter((l) => l !== lang) : [...languages, lang];
    setProfileData({ ...profileData, characteristics: { ...(profileData.characteristics || {}), languages: next } });
  };
  const addCustomLang = () => {
    const v = newLanguage.trim();
    if (!v) return;
    if (languages.some((l) => l.toLowerCase() === v.toLowerCase())) { setNewLanguage(''); return; }
    setProfileData({ ...profileData, characteristics: { ...(profileData.characteristics || {}), languages: [...languages, v] } });
    setNewLanguage('');
  };

  return (
    <div className="space-y-4">
      {/* Basic information */}
      <Card
        title="Basic information"
        subtitle="This is what clients see first. You can change it any time."
        testId="basic-info-card"
      >
        <div className="space-y-4">
          {/* Display name */}
          <div className="w-full sm:max-w-[380px]">
            <Label htmlFor="display-name">{isAgency ? 'Agency name' : 'Display name'}</Label>
            <input
              id="display-name"
              type="text"
              value={profileData.display_name}
              onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value.slice(0, 30) })}
              className={inputCls}
              placeholder={isAgency ? 'Your agency name' : 'Mila'}
              maxLength={30}
              data-testid="display-name-input"
            />
            <p className="text-xs text-[#8E8597] mt-0.5">No real name needed.</p>
          </div>

          {/* Age */}
          <div>
            <Label htmlFor="age">Age</Label>
            <div className="relative max-w-[200px]">
              <input
                id="age"
                type="number"
                value={profileData.age}
                onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                className={`${inputCls} no-spinner`}
                placeholder="27"
                min="18"
                data-testid="age-input"
              />
            </div>
            <p className="text-xs text-[#8E8597] mt-0.5">18 or older.</p>
          </div>

          {/* Gender */}
          <div className="pt-6 border-t border-[#ECE8EF]">
            <Label>Gender</Label>
            <PillToggle
              options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }, { value: 'trans', label: 'Trans' }]}
              value={profileData.gender}
              onChange={(v) => setProfileData({ ...profileData, gender: v })}
              testId="gender-input"
              idKey={(v) => v}
            />
          </div>

          {/* Orientation */}
          <div>
            <Label>Orientation</Label>
            <PillToggle
              options={['Straight', 'Bi', 'Lesbian', 'Gay']}
              value={profileData.characteristics?.orientation}
              onChange={(v) => setProfileData({ ...profileData, characteristics: { ...profileData.characteristics, orientation: v } })}
              testId="orientation-input"
            />
          </div>

          {!isAgencyScoped && (
            <div className="!mt-6 pt-6 border-t border-[#ECE8EF] space-y-4">
              {/* City */}
              <div className="w-full sm:max-w-[380px]">
                <Label htmlFor="city">City</Label>
                <div className="relative">
                  <MapPin size={18} weight="fill" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A2357]" />
                  <input
                    id="city"
                    type="text"
                    value={profileData.location.city}
                    onChange={(e) => setProfileData({ ...profileData, location: { ...profileData.location, city: e.target.value } })}
                    className={`${inputCls} pl-10`}
                    placeholder="Brussels"
                    data-testid="city-input"
                  />
                </div>
                <p className="text-xs text-[#8E8597] mt-0.5">Clients only see your city, never your address.</p>
              </div>

              {/* Country */}
              <div className="w-full sm:max-w-[380px]">
                <Label htmlFor="country">Country</Label>
                <div className="relative">
                  <select
                    id="country"
                    value={profileData.location.country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className={`${inputCls} appearance-none pr-10 cursor-pointer`}
                    data-testid="country-input"
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <CaretDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5F5966] pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Describe yourself */}
          <div className="pt-6 border-t border-[#ECE8EF]">
            <div className="flex items-end justify-between mb-1">
              <Label>Describe yourself</Label>
              <span className="text-xs text-[#BDB4C5]">{bioLen} / 1500</span>
            </div>
            <p className="text-xs text-[#8E8597] -mt-1 mb-0.5">Shown as "My Essence" on your profile. Tell clients what makes you unique.</p>
            <textarea
              value={profileData.bio}
              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value.slice(0, 1500) })}
              className={`${inputCls} h-32 resize-none`}
              placeholder="Warm, curious and easy to talk to. I love good food, art galleries and long conversations over a glass of wine."
              maxLength={1500}
              data-testid="essence-input"
            />
            <div className="h-1 bg-[#ECE8EF] rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-[#7A2357] rounded-full transition-all" style={{ width: `${Math.min(100, (bioLen / 1500) * 100)}%` }} />
            </div>
          </div>

          {/* Languages */}
          <div className="pt-6 border-t border-[#ECE8EF]">
            <div className="flex items-end justify-between mb-1">
              <Label>Languages you speak</Label>
              <span className="text-xs font-semibold text-[#7A2357]">{languages.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_PRESETS.map((lang) => {
                const selected = languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLang(lang)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      selected
                        ? 'bg-[#7A2357]/5 border-[#7A2357] text-[#7A2357]'
                        : 'bg-white border-[#898989] text-[#5F5966] hover:border-[#7A2357]'
                    }`}
                    data-testid={`basic-lang-${lang.toLowerCase()}`}
                  >
                    {selected && <Check size={14} weight="bold" />}
                    {lang}
                  </button>
                );
              })}
              {customLangs.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border bg-[#7A2357]/5 border-[#7A2357] text-[#7A2357]"
                  data-testid={`basic-lang-custom-${lang.toLowerCase()}`}
                >
                  <Check size={14} weight="bold" />
                  {lang}
                  <button type="button" onClick={() => toggleLang(lang)} className="hover:text-red-500" aria-label={`Remove ${lang}`}>
                    <X size={13} weight="bold" />
                  </button>
                </span>
              ))}
              {showAddLanguage ? (
                <span className="inline-flex items-center gap-1 border border-[#7A2357] rounded-full pl-3 pr-1 py-1">
                  <input
                    type="text"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addCustomLang(); setShowAddLanguage(false); }
                      else if (e.key === 'Escape') { setNewLanguage(''); setShowAddLanguage(false); }
                    }}
                    autoFocus
                    placeholder="Italian"
                    className="bg-transparent border-0 focus:ring-0 focus:outline-none text-sm text-[#1B1820] w-24"
                    data-testid="add-language-input"
                  />
                  <button type="button" onClick={() => { addCustomLang(); setShowAddLanguage(false); }} className="p-1.5 rounded-full bg-[#7A2357] text-white" data-testid="add-language-confirm">
                    <Check size={13} weight="bold" />
                  </button>
                  <button type="button" onClick={() => { setNewLanguage(''); setShowAddLanguage(false); }} className="p-1.5 text-[#5F5966] hover:text-red-500" data-testid="add-language-cancel">
                    <X size={13} weight="bold" />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddLanguage(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-dashed border-[#898989] text-[#5F5966] hover:border-[#7A2357] hover:text-[#7A2357] transition-colors"
                  data-testid="add-language-button"
                >
                  <Plus size={14} weight="bold" /> Add language
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Contact information */}
      {!isAgencyScoped && (
        <Card
          title="Contact information"
          subtitle="How clients reach you to make an enquiry."
          testId="contact-info-card"
        >
          <div className="space-y-4">
            {/* Mobile phone */}
            <div className="w-full sm:max-w-[380px]">
              <Label>Mobile phone</Label>
              {(() => {
                const fallback = countryDialCodes[profileData.location.country] || '';
                const { dial: curDial, number } = splitPhone(profileData.contact.phone, fallback);
                return (
                  <div className="flex items-stretch gap-2">
                    <div className="relative w-[118px] flex-shrink-0">
                      <select
                        value={curDial}
                        onChange={(e) => setContact({ phone: joinPhone(e.target.value, number) })}
                        className="w-full h-full bg-white border border-[#898989] rounded-lg pl-3.5 pr-8 py-3 text-[15px] text-[#1B1820] appearance-none cursor-pointer focus:border-[#7A2357] focus:outline-none"
                        data-testid="phone-dial-select"
                      >
                        {!curDial && <option value="">Code</option>}
                        {DIAL_CODE_OPTIONS.map((o) => (
                          <option key={`${o.iso}${o.dial}`} value={o.dial}>{o.iso} {o.dial}</option>
                        ))}
                      </select>
                      <CaretDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5F5966] pointer-events-none" />
                    </div>
                    <input
                      type="tel"
                      value={number}
                      onChange={(e) => setContact({ phone: joinPhone(curDial, e.target.value) })}
                      className={`${inputCls} flex-1`}
                      placeholder="470 12 34 56"
                      data-testid="phone-input"
                    />
                  </div>
                );
              })()}
            </div>

            {/* Email */}
            <div className="w-full sm:max-w-[380px]">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <EnvelopeSimple size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F5966]" />
                <input
                  id="email"
                  type="email"
                  value={profileData.contact.email}
                  onChange={(e) => setContact({ email: e.target.value })}
                  className={`${inputCls} pl-10`}
                  placeholder="mila@example.com"
                  data-testid="email-input"
                />
              </div>
            </div>

            {/* Messaging apps */}
            <div>
              <Label>Clients can also reach you on</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {MESSAGING_APPS.map((app) => {
                  const selected = profileData.contact[app.key] || false;
                  return (
                    <button
                      key={app.key}
                      type="button"
                      onClick={() => setContact({ [app.key]: !selected })}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        selected ? 'bg-[#7A2357]/5 border-[#7A2357] text-[#7A2357]' : 'bg-white border-[#898989] text-[#5F5966] hover:border-[#7A2357]'
                      }`}
                      data-testid={`contact-${app.label.toLowerCase()}`}
                    >
                      {selected && <Check size={14} weight="bold" />}
                      {app.label}
                    </button>
                  );
                })}
              </div>

              {/* Username-based platform IDs */}
              {(profileData.contact.hasTelegram || profileData.contact.hasLine || profileData.contact.hasWechat) && (
                <div className="mt-4 space-y-4 bg-[#F7F5F9] border border-[#ECE8EF] rounded-xl p-4">
                  {profileData.contact.hasTelegram && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[13px] font-semibold text-[#1B1820]">Telegram username</span>
                        <span className="uppercase tracking-wider text-[10px] font-semibold text-[#A3243B]">Required</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F5966]">@</span>
                        <input
                          type="text"
                          value={(profileData.contact.telegramId || '').replace(/^@/, '')}
                          onChange={(e) => setContact({ telegramId: e.target.value })}
                          className={`${inputCls} pl-8`}
                          placeholder="mila.brussels"
                          data-testid="telegram-id-input"
                        />
                      </div>
                      <p className="text-xs text-[#8E8597] mt-0.5">Find it in Telegram &rsaquo; Settings &rsaquo; Username</p>
                    </div>
                  )}
                  {profileData.contact.hasLine && (
                    <div>
                      <Label htmlFor="line-id">Line ID</Label>
                      <input id="line-id" type="text" value={profileData.contact.lineId || ''} onChange={(e) => setContact({ lineId: e.target.value })} className={inputCls} placeholder="your-line-id" data-testid="line-id-input" />
                    </div>
                  )}
                  {profileData.contact.hasWechat && (
                    <div>
                      <Label htmlFor="wechat-id">WeChat ID</Label>
                      <input id="wechat-id" type="text" value={profileData.contact.wechatId || ''} onChange={(e) => setContact({ wechatId: e.target.value })} className={inputCls} placeholder="your-wechat-id" data-testid="wechat-id-input" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Physical characteristics */}
      <Card
        title="Physical characteristics"
        subtitle="Fill in only what you want on your profile. These details power the search filters."
        tag="Optional"
        testId="physical-characteristics-card"
      >
        <CharacteristicsForm
          characteristics={profileData.characteristics}
          onChange={(c) => setProfileData({ ...profileData, characteristics: c })}
        />
      </Card>
    </div>
  );
}
