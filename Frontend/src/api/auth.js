import api from './client';

export const registerApi = (data) => api.post('/auth/register', data).then((r) => r.data);
export const loginApi = (data) => api.post('/auth/login', data).then((r) => r.data);
export const verifyEmailApi = (data) => api.post('/auth/verify-email', data).then((r) => r.data);
export const resendOtpApi = (data) => api.post('/auth/resend-otp', data).then((r) => r.data);
export const forgotPasswordApi = (data) => api.post('/auth/forgot-password', data).then((r) => r.data);
export const resetPasswordApi = (data) => api.post('/auth/reset-password', data).then((r) => r.data);
export const getMeApi = () => api.get('/auth/me').then((r) => r.data);