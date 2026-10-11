import { useState } from 'react';
import { Dialog } from '@/components/advertiser/DashboardParts';
import { toast } from 'sonner';
import { notifyError, notifyProblem } from '../lib/notify';
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

function Slot({ label, helper, k, required, doc, onRemove, onFile }) {
  return (
    <div className="vf-slot" data-testid={`slot-${k}`}>
      <div className="h"><b>{label}{required ? '' : ' (optional)'}</b>{doc && <button type="button" onClick={() => onRemove(k)} data-testid={`remove-${k}`}>Remove</button>}</div>
      <p>{helper}</p>
      {doc ? (
        <div className="pv"><img src={doc} alt="" /></div>
      ) : (
        <label className="up" data-testid={`upload-${k}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B04585" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
          <span>Upload photo · max {MAX_MB} MB</span>
          <input type="file" accept="image/*" hidden onChange={(e) => onFile(k, e.target.files?.[0])} />
        </label>
      )}
    </div>
  );
}

export default function VerificationModal({ open, onClose, onSubmitted, providerId }) {
  const [docs, setDocs] = useState({ id_front: null, id_selfie: null, secondary_doc: null });
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleFile = async (key, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notifyProblem('That file type is not supported.', 'Upload an image file — JPG, PNG, WebP or HEIC.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      notifyProblem(`That file is too large (max ${MAX_MB} MB).`, 'Compress the image or choose a smaller file, then upload again.');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setDocs((d) => ({ ...d, [key]: dataUrl }));
  };
  const removeDoc = (key) => setDocs((d) => ({ ...d, [key]: null }));
  const canSubmit = docs.id_front && docs.id_selfie && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitVerification({ id_front: docs.id_front, id_selfie: docs.id_selfie, secondary_doc: docs.secondary_doc || null }, providerId);
      toast.success('Verification submitted — we review it within 24 hours.');
      onSubmitted && onSubmitted();
      onClose();
    } catch (error) {
      notifyError(error, "We couldn't submit your verification.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog title="Verify your identity" onClose={onClose} width={640}
      footer={<>
        <button type="button" className="x-btn white" onClick={onClose} data-testid="verification-cancel">Cancel</button>
        <button type="button" className="x-btn primary" disabled={!canSubmit} onClick={handleSubmit} data-testid="verification-submit">{submitting ? 'Submitting…' : 'Submit for review'}</button>
      </>}>
      <div className="vf" data-testid="verification-modal">
        <p className="lead">Only verified profiles go live. We review your documents by hand within 24 hours and never show them on your profile.</p>
        <Slot label="Government ID (front)" helper="Passport, national ID card or driving licence. All four corners visible and the text readable." k="id_front" required doc={docs.id_front} onRemove={removeDoc} onFile={handleFile} />
        <Slot label="Selfie with your ID" helper="Hold your ID next to your face. This confirms the ID belongs to you." k="id_selfie" required doc={docs.id_selfie} onRemove={removeDoc} onFile={handleFile} />
        <Slot label="Second document" helper="Helps us verify faster — a second ID, a utility bill or anything with your name on it." k="secondary_doc" required={false} doc={docs.secondary_doc} onRemove={removeDoc} onFile={handleFile} />
      </div>
    </Dialog>
  );
}
