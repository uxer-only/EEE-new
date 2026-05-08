import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CaretLeft, CheckCircle, X, Warning, Clock, User, 
  MapPin, Calendar, Image, VideoCamera, ShieldCheck
} from 'phosphor-react';
import { useAuth } from '@/context/AuthContext';
import { getAdminProviderDetail, approveMedia, verifyProvider } from '@/services/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminProviderDetail() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast.error('Admin access required');
      navigate('/login');
      return;
    }
    fetchProvider();
  }, [user, navigate, providerId]);

  const fetchProvider = async () => {
    try {
      const response = await getAdminProviderDetail(providerId);
      setProvider(response.data);
    } catch (error) {
      toast.error('Failed to load provider');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMedia = async (mediaId) => {
    setProcessing(true);
    try {
      await approveMedia(mediaId, 'approved');
      toast.success('Media approved');
      fetchProvider();
    } catch (error) {
      toast.error('Failed to approve media');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectMedia = async (mediaId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setProcessing(true);
    try {
      await approveMedia(mediaId, 'rejected', rejectionReason);
      toast.success('Media rejected');
      setSelectedMedia(null);
      setRejectionReason('');
      fetchProvider();
    } catch (error) {
      toast.error('Failed to reject media');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyProvider = async () => {
    setProcessing(true);
    try {
      await verifyProvider(providerId, !provider.verified);
      toast.success(provider.verified ? 'Provider unverified' : 'Provider verified');
      fetchProvider();
    } catch (error) {
      toast.error('Failed to update verification');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded flex items-center gap-1">
          <CheckCircle size={12} /> Approved
        </span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-500/20 text-red-500 text-xs rounded flex items-center gap-1">
          <X size={12} /> Rejected
        </span>;
      default:
        return <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs rounded flex items-center gap-1">
          <Clock size={12} /> Pending
        </span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
        <div className="shimmer w-16 h-16 rounded-full"></div>
      </div>
    );
  }

  if (!provider) return null;

  const pendingMedia = provider.media?.filter(m => m.status === 'pending') || [];
  const approvedMedia = provider.media?.filter(m => m.status === 'approved') || [];
  const rejectedMedia = provider.media?.filter(m => m.status === 'rejected') || [];

  return (
    <div className="min-h-screen bg-[#0A0A0C]">
      {/* Header */}
      <header className="floating-header" data-testid="admin-header">
        <div className="section-padding py-6 flex items-center justify-between">
          <Link 
            to="/admin" 
            className="flex items-center gap-2 text-[#A1A1AA] hover:text-[#C6A87C] transition-colors"
          >
            <CaretLeft size={20} />
            <span className="uppercase tracking-wider text-sm">Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl font-playfair text-[#C6A87C]">Provider Management</h1>
          <div></div>
        </div>
      </header>

      <div className="pt-32 pb-20 section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Provider Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-premium p-8 mb-8"
            data-testid="provider-info"
          >
            <div className="flex items-start gap-8">
              <img
                src={provider.photos?.[0] || 'https://via.placeholder.com/120'}
                alt={provider.display_name}
                className="w-32 h-32 rounded-lg object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-3xl font-playfair text-[#F2F0ED]">
                    {provider.display_name}
                    {provider.age && <span className="text-[#A1A1AA]">, {provider.age}</span>}
                  </h2>
                  {provider.verified && (
                    <span className="verified-badge">
                      <CheckCircle size={16} weight="fill" /> Verified
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-[#A1A1AA]">
                    <User size={16} />
                    <span>{provider.user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#A1A1AA]">
                    <MapPin size={16} />
                    <span>{provider.location?.city}, {provider.location?.country}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#A1A1AA]">
                    <Calendar size={16} />
                    <span>Joined {new Date(provider.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#A1A1AA]">
                    <span className={`capitalize ${provider.gender === 'female' ? 'text-pink-400' : provider.gender === 'male' ? 'text-blue-400' : 'text-purple-400'}`}>
                      {provider.gender || 'Not specified'}
                    </span>
                  </div>
                </div>

                {provider.bio && (
                  <p className="text-[#A1A1AA] mt-4 text-sm leading-relaxed">{provider.bio}</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleVerifyProvider}
                  disabled={processing}
                  className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                    provider.verified 
                      ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                      : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                  }`}
                  data-testid="verify-button"
                >
                  <ShieldCheck size={20} />
                  {provider.verified ? 'Remove Verification' : 'Verify Provider'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Pending Media Section */}
          {pendingMedia.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-premium p-8 mb-8 border-amber-500/30"
              data-testid="pending-media-section"
            >
              <div className="flex items-center gap-3 mb-6">
                <Warning size={24} className="text-amber-500" />
                <h3 className="text-xl font-playfair text-[#F2F0ED]">
                  Pending Approval ({pendingMedia.length})
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pendingMedia.map((media) => (
                  <div 
                    key={media.media_id} 
                    className="relative group"
                    data-testid={`pending-media-${media.media_id}`}
                  >
                    <div className="aspect-[3/4] overflow-hidden rounded border-2 border-amber-500/50">
                      {media.media_type === 'video' ? (
                        <video 
                          src={media.url} 
                          className="w-full h-full object-cover"
                          controls
                        />
                      ) : (
                        <img 
                          src={media.url} 
                          alt="Pending media"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="absolute top-2 right-2">
                      {media.media_type === 'video' ? (
                        <VideoCamera size={20} className="text-white drop-shadow" />
                      ) : (
                        <Image size={20} className="text-white drop-shadow" />
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveMedia(media.media_id)}
                          disabled={processing}
                          className="flex-1 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                          data-testid={`approve-${media.media_id}`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setSelectedMedia(media)}
                          disabled={processing}
                          className="flex-1 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                          data-testid={`reject-${media.media_id}`}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Approved Media Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-premium p-8 mb-8"
            data-testid="approved-media-section"
          >
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle size={24} className="text-green-500" />
              <h3 className="text-xl font-playfair text-[#F2F0ED]">
                Approved Media ({approvedMedia.length})
              </h3>
            </div>

            {approvedMedia.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {approvedMedia.map((media) => (
                  <div 
                    key={media.media_id} 
                    className="relative"
                    data-testid={`approved-media-${media.media_id}`}
                  >
                    <div className="aspect-[3/4] overflow-hidden rounded border border-green-500/30">
                      {media.media_type === 'video' ? (
                        <video 
                          src={media.url} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img 
                          src={media.url} 
                          alt="Approved media"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="absolute top-2 right-2">
                      {getStatusBadge('approved')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#52525B] text-center py-8">No approved media yet</p>
            )}
          </motion.div>

          {/* Rejected Media Section */}
          {rejectedMedia.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-premium p-8"
              data-testid="rejected-media-section"
            >
              <div className="flex items-center gap-3 mb-6">
                <X size={24} className="text-red-500" />
                <h3 className="text-xl font-playfair text-[#F2F0ED]">
                  Rejected Media ({rejectedMedia.length})
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {rejectedMedia.map((media) => (
                  <div 
                    key={media.media_id} 
                    className="relative opacity-50"
                    data-testid={`rejected-media-${media.media_id}`}
                  >
                    <div className="aspect-[3/4] overflow-hidden rounded border border-red-500/30">
                      {media.media_type === 'video' ? (
                        <video 
                          src={media.url} 
                          className="w-full h-full object-cover grayscale"
                        />
                      ) : (
                        <img 
                          src={media.url} 
                          alt="Rejected media"
                          className="w-full h-full object-cover grayscale"
                        />
                      )}
                    </div>
                    <div className="absolute top-2 right-2">
                      {getStatusBadge('rejected')}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* No Media State */}
          {(!provider.media || provider.media.length === 0) && (
            <div className="card-premium p-12 text-center">
              <Image size={48} className="text-[#52525B] mx-auto mb-4" />
              <p className="text-[#A1A1AA]">No media uploaded by this provider yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="bg-[#141416] border-[#27272A] text-[#F2F0ED] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-playfair">Reject Media</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <label className="input-label">Rejection Reason</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="input-premium w-full h-32 resize-none"
              data-testid="rejection-reason-input"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedMedia(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectMedia(selectedMedia?.media_id)}
                disabled={processing || !rejectionReason.trim()}
                className="btn-primary flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50"
                data-testid="confirm-reject-button"
              >
                {processing ? 'Rejecting...' : 'Reject Media'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
