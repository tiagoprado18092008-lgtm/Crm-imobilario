import api from './client';

export const searchNumbers = (country: string, areaCode?: string, type?: string) =>
  api.get('/phone-numbers/search', { params: { country, areaCode, type } });

export const listNumbers = () => api.get('/phone-numbers');
export const createPaymentIntent = (phoneNumber: string, monthlyPrice: number) =>
  api.post('/phone-numbers/payment-intent', { phoneNumber, monthlyPrice });
export const purchaseNumber = (phoneNumber: string, friendlyName?: string) =>
  api.post('/phone-numbers', { phoneNumber, friendlyName });
export const releaseNumber = (id: string) => api.delete(`/phone-numbers/${id}`);
export const updateNumber = (id: string, friendlyName: string) =>
  api.patch(`/phone-numbers/${id}`, { friendlyName });

export const autoProvisionTwilio = () => api.post('/phone-numbers/auto-provision');
export const verifyPersonalNumber = (phoneNumber: string, channel: 'sms' | 'call' = 'call') =>
  api.post('/phone-numbers/verify-personal', { phoneNumber, channel });
export const confirmPersonalNumber = (phoneNumber: string, friendlyName?: string) =>
  api.post('/phone-numbers/confirm-personal', { phoneNumber, friendlyName });
export const updateRouting = (id: string, updates: { ringAll?: boolean; voicemailEnabled?: boolean }) =>
  api.patch(`/phone-numbers/${id}/routing`, updates);
