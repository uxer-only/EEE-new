import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getPendingVerifications, updateVerification } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, X, Clock, ShieldCheck, Eye, CaretLeft } from 'phosphor-react';
import { toast } from 'sonner';
import SiteHeader from '@/components/SiteHeader';

const DOC_LABELS = {
  id_front: 'Government ID (front)',
  id_selfie: 'Selfie with ID',
  secondary_doc: 'Secondary document',
};

export default function AdminPanel() {
  const { logout } = useAuth();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      const response = await getPendingVerifications();
      setVerifications(response.data || []);
    } catch (error) {
      toast.error('Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDecide = async (status) => {
    if (status === 'rejected' && !reason.trim()) {
      toast.error('Please add a reason so the provider knows what to fix');
      return;
    }
    try {
      await updateVerification(selected.provider_id, {
        status,
        reason: status === 'rejected' ? reason.trim() : null,
      });
      toast.success(status === 'approved' ? 'Provider approved' : 'Provider rejected');
      setSelected(null);
      setReason('');
      setRejecting(false);
      fetchVerifications();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Update failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
        <p className="text-[#A1A1AA]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C]">
      <SiteHeader
        leftSlot={
          <Link to="/admin" className="flex items-center gap-2 text-[#A1A1AA] hover:text-[#DA4167] transition-colors" data-testid="back-to-admin-link">
            <CaretLeft size={18} />
            <span className="uppercase tracking-wider text-xs md:text-sm">Admin Dashboard</span>
          </Link>
        }
        links={[
          { label: 'Logout', onClick: logout, testId: 'logout-button' }
        ]}
      />

      <div className="pt-28 md:pt-32 pb-20 section-padding">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck size={26} weight="thin" className="text-[#832161]" />
              <h2 className="text-3xl md:text-4xl text-[#F2F0ED]">
 Verification queue
 </h2>
            </div>
            <p className="text-[#A1A1AA]">
              {verifications.length === 0
                ? 'No pending submissions — everything\u2019s caught up.'
                : `${verifications.length} submission${verifications.length > 1 ? 's' : ''} awaiting review`}
            </p>
          </div>

          {verifications.length === 0 ? (
            <div className="card-premium p-12 text-center" data-testid="empty-state">
              <CheckCircle size={48} weight="thin" className="text-[#832161] mx-auto mb-4" />
              <p className="text-[#F2F0ED] text-lg mb-1">All clear</p>
              <p className="text-[#A1A1AA] text-sm">
                New submissions will appear here for review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {verifications.map((v, i) => (
                <motion.div
                  key={v.provider_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-premium p-5 md:p-6"
                  data-testid={`verification-row-${v.provider_id}`}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F2F0ED] text-lg font-medium">
                        {v.display_name || v.user?.name || 'Unnamed provider'}
                      </p>
                      <p className="text-[#A1A1AA] text-sm">
                        {v.user?.email} {v.location?.city && `· ${v.location.city}`}
                        {v.location?.country && `, ${v.location.country}`}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock size={14} className="text-[#71717A]" />
                        <span className="text-[#71717A] text-xs">
                          {v.documents?.length || 0} document{v.documents?.length !== 1 ? 's' : ''} submitted
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelected(v)}
                      className="btn-secondary flex items-center gap-2 text-sm"
                      data-testid={`review-btn-${v.provider_id}`}
                    >
                      <Eye size={16} />
                      Review
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => { setSelected(null); setRejecting(false); setReason(''); }}
          data-testid="review-drawer"
        >
          <div
            className="relative w-full max-w-4xl bg-[#141416] border border-[#27272A] rounded-lg my-8 max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setSelected(null); setRejecting(false); setReason(''); }}
              className="absolute top-4 right-4 p-2 text-[#A1A1AA] hover:text-[#F2F0ED] z-10"
              aria-label="Close"
              data-testid="review-close"
            >
              <X size={20} weight="bold" />
            </button>

            <div className="p-6 md:p-8">
              <h3 className="text-2xl text-[#F2F0ED] mb-1">
 {selected.display_name || selected.user?.name}
 </h3>
              <p className="text-[#A1A1AA] text-sm mb-6">
                {selected.user?.email}
                {selected.location?.city && ` · ${selected.location.city}`}
                {selected.age && ` · ${selected.age} y/o`}
                {selected.gender && ` · ${selected.gender}`}
              </p>

              {/* Documents grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {(selected.documents || []).map((d) => (
                  <div
                    key={d.doc_id}
                    className="border border-[#27272A] rounded-lg p-3"
                    data-testid={`doc-${d.document_type}`}
                  >
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA] mb-2">
                      {DOC_LABELS[d.document_type] || d.document_type}
                    </p>
                    <button
                      onClick={() => setLightbox(d.document_url)}
                      className="block w-full aspect-[4/3] bg-[#0A0A0C] overflow-hidden rounded hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={d.document_url}
                        alt={d.document_type}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Decision */}
              {rejecting ? (
                <div className="space-y-4" data-testid="reject-form">
                  <div>
                    <label className="input-label">Reason (sent to provider)</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="input-premium w-full h-24 resize-none"
                      placeholder="e.g. ID photo is blurry — please resubmit with clearer corners"
                      data-testid="reject-reason"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setRejecting(false); setReason(''); }}
                      className="flex-1 btn-secondary"
                      data-testid="reject-cancel"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => handleDecide('rejected')}
                      className="flex-1 btn-primary bg-red-500 hover:bg-red-400"
                      data-testid="reject-confirm"
                    >
                      Send rejection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setRejecting(true)}
                    className="flex-1 btn-secondary"
                    data-testid="reject-btn"
                  >
                    Reject with reason
                  </button>
                  <button
                    onClick={() => handleDecide('approved')}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                    data-testid="approve-btn"
                  >
                    <CheckCircle size={18} weight="fill" />
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          data-testid="lightbox"
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
            aria-label="Close lightbox"
          >
            <X size={28} weight="bold" />
          </button>
          <img
            src={lightbox}
            alt="Document preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
