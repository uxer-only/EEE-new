import { useState } from 'react';
import { Plus } from 'phosphor-react';
import { serviceOptionsFor } from '@/constants/companionData';

/**
 * Services picker — identical UI to the independent provider flow.
 * Props:
 *  - data: { services: object, companionshipType: string }
 *  - update: (patch) => void   // merges top-level keys into parent state
 *  - showCompanionshipType: bool (default true)
 */
export const ServicesStep = ({ data, update, showCompanionshipType = true }) => {
  const [newService, setNewService] = useState('');
  const services = data.services || {};
  const serviceOptions = serviceOptionsFor(data.companionshipType);

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-[#7A2357] mb-6">Services</h3>

      {showCompanionshipType && (
        <div className="mb-8">
          <label className="input-label mb-4">Type of companionship</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => update({ companionshipType: 'escort' })}
              className={`px-6 py-3 border text-sm transition-all ${
                data.companionshipType === 'escort'
                  ? 'border-[#A3243B] bg-[#A3243B] text-white shadow-sm'
                  : 'border-[#A3243B]/50 text-[#A3243B] bg-white hover:bg-[#A3243B]/10 hover:border-[#A3243B]'
              }`}
            >
              Escort
            </button>
            <button
              type="button"
              onClick={() => update({ companionshipType: 'erotic-massage' })}
              className={`px-6 py-3 border text-sm transition-all ${
                data.companionshipType === 'erotic-massage'
                  ? 'border-[#A3243B] bg-[#A3243B] text-white shadow-sm'
                  : 'border-[#A3243B]/50 text-[#A3243B] bg-white hover:bg-[#A3243B]/10 hover:border-[#A3243B]'
              }`}
            >
              Erotic Massage
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-[#dbdadd] my-4"></div>

      {/* Accepts people with disabilities */}
      <div className="rounded-lg border border-[#7A2357]/30 bg-[#7A2357]/5 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!data.accepts_disabilities}
            onChange={(e) => update({ accepts_disabilities: e.target.checked })}
            className="mt-0.5 w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#7A2357] checked:border-[#7A2357]"
            data-testid="accepts-disabilities-checkbox"
          />
          <span className="text-[#000000] font-medium">We accept people with disabilities</span>
        </label>
      </div>

      <p className="text-[#000000] text-sm mb-4">Select the services you offer and specify if they are inclusive or at an extra cost</p>

      <div className="border border-[#dbdadd] rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[#4B4B4B] border-b border-[#4B4B4B]">
          <div className="col-span-5 text-[#FFFFFF] text-sm font-medium">Service</div>
          <div className="col-span-3 text-[#FFFFFF] text-sm font-medium">Type</div>
          <div className="col-span-4 text-[#FFFFFF] text-sm font-medium text-right">Price</div>
        </div>
        <div>
          {serviceOptions.map((service, index) => {
            const serviceData = services[service] || { type: null, price: '' };
            return (
              <div
                key={service}
                className={`grid grid-cols-12 gap-4 px-4 py-3 items-center ${
                  index !== serviceOptions.length - 1 ? 'border-b border-[#dbdadd]' : ''
                } ${serviceData.type ? 'bg-[#7A2357]/5' : ''}`}
              >
                <div className="col-span-5 text-[#000000] text-sm">{service}</div>
                <div className="col-span-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => update({ services: { ...services, [service]: { type: serviceData.type === 'inclusive' ? null : 'inclusive', price: '' } } })}
                    className={`px-3 h-9 text-xs border transition-all ${
                      serviceData.type === 'inclusive'
                        ? 'border-[#A3243B] bg-[#A3243B] text-white shadow-sm'
                        : 'border-[#A3243B]/50 text-[#A3243B] bg-white hover:bg-[#A3243B]/10 hover:border-[#A3243B]'
                    }`}
                  >
                    Inclusive
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ services: { ...services, [service]: { type: serviceData.type === 'extra' ? null : 'extra', price: serviceData.price } } })}
                    className={`px-3 h-9 text-xs border transition-all ${
                      serviceData.type === 'extra'
                        ? 'border-[#A3243B] bg-[#A3243B] text-white shadow-sm'
                        : 'border-[#A3243B]/50 text-[#A3243B] bg-white hover:bg-[#A3243B]/10 hover:border-[#A3243B]'
                    }`}
                  >
                    Extra
                  </button>
                </div>
                <div className="col-span-4 flex justify-end">
                  {serviceData.type === 'extra' ? (
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#000000] text-sm">€</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={serviceData.price}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          update({ services: { ...services, [service]: { ...serviceData, price: value } } });
                        }}
                        className="input-premium w-full h-9 !pl-7 !pr-2 text-xs"
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    <span className="text-[#000000] text-sm">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 p-4 border border-[#dbdadd] rounded-lg">
        <label className="input-label mb-3">Add another service</label>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            className="input-premium w-64"
            placeholder="Enter service name..."
            data-testid="custom-service-input"
          />
          <button
            type="button"
            onClick={() => {
              if (newService.trim()) {
                update({ services: { ...services, [newService.trim()]: { type: 'inclusive', price: '' } } });
                setNewService('');
              }
            }}
            className="btn-secondary h-[50px] px-6 flex items-center gap-2"
          >
            <Plus size={18} />
            Add
          </button>
        </div>
      </div>

      {Object.keys(services).filter((s) => services[s]?.type).length > 0 && (
        <div className="mt-4 p-4 border border-[#dbdadd] rounded">
          <p className="text-[#000000] text-sm mb-2">
            Selected: {Object.keys(services).filter((s) => services[s]?.type === 'inclusive').length} inclusive, {Object.keys(services).filter((s) => services[s]?.type === 'extra').length} extra
          </p>
        </div>
      )}
    </div>
  );
};

export default ServicesStep;
