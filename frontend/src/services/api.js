import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auth
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);
export const resetPassword = (data) => api.post('/auth/reset-password', data);

// Providers
export const getProviders = (params) => api.get('/providers', { params });
export const getProviderById = (id) => api.get(`/providers/${id}`);
export const createProviderProfile = (data) => api.post('/providers/profile', data);
export const updateProviderProfile = (data, providerId) =>
  api.put('/providers/profile', data, { params: providerId ? { provider_id: providerId } : {} });
export const deleteProviderProfile = (providerId) =>
  api.delete('/providers/profile', { params: providerId ? { provider_id: providerId } : {} });
export const getProviderDashboard = (providerId) =>
  api.get('/providers/dashboard/stats', { params: providerId ? { provider_id: providerId } : {} });
export const getAgencyProfiles = () => api.get('/agency/profiles');
export const getAgencyProfile = () => api.get('/agency/profile');
export const saveAgencyProfile = (data) => api.post('/agency/profile', data);
export const syncAgencyDefaults = () => api.post('/agency/sync-defaults');
export const deleteAgencyProfile = () => api.delete('/agency/profile');
export const setProfilePlan = (providerId, data) => api.put(`/agency/profiles/${providerId}/plan`, data);

// Messages
export const getConversations = () => api.get('/conversations');
export const getMessages = (conversationId) => api.get(`/conversations/${conversationId}/messages`);
export const sendMessage = (data) => api.post('/messages', data);
export const createConversation = (providerId) => 
  api.post(`/conversations?provider_id=${providerId}`);

// Verification
export const submitVerification = (data, providerId) =>
  api.post('/verification/submit', data, { params: providerId ? { provider_id: providerId } : {} });
export const getVerificationStatus = (providerId) =>
  api.get('/verification/status', { params: providerId ? { provider_id: providerId } : {} });

// Admin
export const getPendingVerifications = () => api.get('/admin/verifications');
export const updateVerification = (providerId, data) =>
  api.put(`/admin/verifications/${providerId}`, data);

// Admin Dashboard
export const getAdminProviders = () => api.get('/admin/providers');
export const getAdminProviderDetail = (providerId) => api.get(`/admin/providers/${providerId}`);
export const approveMedia = (mediaId, status, reason) => 
  api.put(`/admin/media/${mediaId}/approve`, { status, reason });
export const getAdminStats = () => api.get('/admin/stats');
export const getAdminTraffic = (days = 7) => api.get(`/admin/traffic?days=${days}`);
export const verifyProvider = (providerId, verified) => 
  api.post(`/admin/providers/${providerId}/verify`, { verified });

// Admin - Agency management
export const getAdminAgencies = () => api.get('/admin/agencies');
export const getAdminAgencyDetail = (agencyUserId) => api.get(`/admin/agencies/${agencyUserId}`);
export const suspendAgency = (agencyUserId, suspend) =>
  api.post(`/admin/agencies/${agencyUserId}/suspend`, { suspend });
export const deleteAgency = (agencyUserId) => api.delete(`/admin/agencies/${agencyUserId}`);

// Traffic tracking
export const trackPageView = (page, userId) => 
  api.post('/track', { page, user_id: userId });

// Subscriptions / Payments
export const getMySubscription = (providerId) =>
  api.get('/subscriptions/me', { params: providerId ? { provider_id: providerId } : {} });
export const createSubscriptionCheckout = (data) =>
  api.post('/subscriptions/checkout', data);
export const getSubscriptionStatus = (sessionId) =>
  api.get(`/subscriptions/status/${sessionId}`);
export const createBulkCheckout = (data) =>
  api.post('/subscriptions/checkout-bulk', data);
export const updateAutoRenew = (autoRenew, providerId) =>
  api.put('/subscriptions/auto-renew', { auto_renew: autoRenew }, { params: providerId ? { provider_id: providerId } : {} });

// Enquiries
export const createEnquiry = (data) => api.post('/enquiries', data);
export const listMyEnquiries = (providerId) =>
  api.get('/enquiries/mine', { params: providerId ? { provider_id: providerId } : {} });
export const markEnquiryRead = (id, read = true) =>
  api.put(`/enquiries/${id}/read`, { read });
export const deleteEnquiry = (id) => api.delete(`/enquiries/${id}`);
export const replyToEnquiry = (id, message) =>
  api.post(`/enquiries/${id}/reply`, { message });

// Invoices
export const listMyInvoices = (providerId) =>
  api.get('/invoices/mine', { params: providerId ? { provider_id: providerId } : {} });
export const invoicePdfUrl = (id) => `${api.defaults.baseURL}/invoices/${id}/pdf`;
export const invoiceViewUrl = (id) => `${api.defaults.baseURL}/invoices/${id}/pdf?inline=1`;

export default api;
