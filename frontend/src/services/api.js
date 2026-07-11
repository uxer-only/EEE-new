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
export const updateProviderProfile = (data) => api.put('/providers/profile', data);
export const deleteProviderProfile = () => api.delete('/providers/profile');
export const getProviderDashboard = () => api.get('/providers/dashboard/stats');

// Messages
export const getConversations = () => api.get('/conversations');
export const getMessages = (conversationId) => api.get(`/conversations/${conversationId}/messages`);
export const sendMessage = (data) => api.post('/messages', data);
export const createConversation = (providerId) => 
  api.post(`/conversations?provider_id=${providerId}`);

// Verification
export const submitVerification = (data) => api.post('/verification/submit', data);
export const getVerificationStatus = () => api.get('/verification/status');

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

// Traffic tracking
export const trackPageView = (page, userId) => 
  api.post('/track', { page, user_id: userId });

// Subscriptions / Payments
export const getMySubscription = () => api.get('/subscriptions/me');
export const createSubscriptionCheckout = (data) =>
  api.post('/subscriptions/checkout', data);
export const getSubscriptionStatus = (sessionId) =>
  api.get(`/subscriptions/status/${sessionId}`);
export const updateAutoRenew = (autoRenew) =>
  api.put('/subscriptions/auto-renew', { auto_renew: autoRenew });

// Enquiries
export const createEnquiry = (data) => api.post('/enquiries', data);
export const listMyEnquiries = () => api.get('/enquiries/mine');
export const markEnquiryRead = (id, read = true) =>
  api.put(`/enquiries/${id}/read`, { read });

// Invoices
export const listMyInvoices = () => api.get('/invoices/mine');
export const invoicePdfUrl = (id) => `${api.defaults.baseURL}/invoices/${id}/pdf`;

export default api;
