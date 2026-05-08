import { useState } from 'react';
import { X, UploadSimple, CheckCircle, ShieldCheck, Image as ImageIcon } from 'phosphor-react';
import { toast } from 'sonner';
import { submitVerification } from '@/services/api';

const MAX_MB = 5;

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function VerificationModal({ open, onClose, onSubmitted }) {
  const [docs, setDocs] = useState({ id_front: null, id_selfie: null, secondary_doc: null });
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleFile = async (key, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP, or HEIC)');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File too large — max ${MAX_MB} MB`);
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setDocs({ ...docs, [key]: dataUrl });
  };

  const removeDoc = (key) => setDocs({ ...docs, [key]: null });

  const canSubmit = docs.id_front && docs.id_selfie && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitVerification({
        id_front: docs.id_front,
        id_selfie: docs.id_selfie,
        secondary_doc: docs.secondary_doc || null,
      });
      toast.success('Verification submitted — we\'ll review within 24 hours');
      onSubmitted && onSubmitted();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const Slot = ({ label, helper, k, required }) => (
    <div className="border border-[#27272A] rounded-lg p-4" data-testid={`slot-${k}`}>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[#F2F0ED] text-sm font-medium">
          {label} {required && <span className="text-[#C6A87C]">*</span>}
        </p>
        {docs[k] && (
          <button
            onClick={() => removeDoc(k)}
            className="text-[#A1A1AA] hover:text-red-400 text-xs uppercase tracking-wider"
            data-testid={`remove-${k}`}
          >
            Remove
          </button>
        )}
      </div>
      <p className="text-[#71717A] text-xs mb-3 leading-relaxed">{helper}</p>
      {docs[k] ? (
        <div className="relative aspect-[4/3] bg-[#0A0A0C] overflow-hidden rounded">
          <img src={docs[k]} alt="" className="w-full h-full object-contain" />
        </div>
      ) : (
        <label
          className="flex flex-col items-center justify-center aspect-[4/3] border border-dashed border-[#3F3F46] rounded cursor-pointer hover:border-[#C6A87C] transition-colors"
          data-testid={`upload-${k}`}
        >
          <UploadSimple size={28} weight="thin" className="text-[#A1A1AA] mb-2" />
          <span className="text-[#A1A1AA] text-xs uppercase tracking-wider">Upload photo</span>
          <span className="text-[#52525B] text-xs mt-1">Max {MAX_MB} MB</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(k, e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      data-testid="verification-modal"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#141416] border border-[#27272A] rounded-lg my-8 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#A1A1AA] hover:text-[#F2F0ED] transition-colors z-10"
          aria-label="Close"
          data-testid="close-verification-modal"
        >
          <X size={20} weight="bold" />
        </button>

        <div className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck size={24} className="text-[#C6A87C]" weight="thin" />
            <h2 className="text-2xl font-playfair text-[#F2F0ED]">Verify your identity</h2>
          </div>
          <p className="text-[#A1A1AA] text-sm leading-relaxed mb-6">
            Verification is our promise of trust. Only verified providers appear in search. We review submissions manually within 24 hours and never share your documents.
          </p>

          <div className="space-y-4 mb-6">
            <Slot
              label="Government ID (front)"
              helper="Passport, national ID card, or driver's license. Make sure all four corners are visible and text is readable."
              k="id_front"
              required
            />
            <Slot
              label="Selfie with your ID"
              helper="Hold your ID next to your face. This confirms the ID belongs to you."
              k="id_selfie"
              required
            />
            <Slot
              label="Secondary document (optional)"
              helper="Helps us verify faster — a second ID, utility bill, or anything with your name on it."
              k="secondary_doc"
              required={false}
            />
          </div>

          <div className="rounded border border-[#27272A] bg-[#C6A87C]/5 p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle size={18} weight="fill" className="text-[#C6A87C] mt-0.5 shrink-0" />
              <div className="text-[#A1A1AA] text-xs leading-relaxed">
                <p className="text-[#F2F0ED] font-medium mb-1">Your privacy is protected</p>
                <p>Documents are only used for verification and are never shown on your public profile.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary"
              data-testid="verification-cancel"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="verification-submit"
            >
              {submitting ? 'Submitting…' : 'Submit for review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
