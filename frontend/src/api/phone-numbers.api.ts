import api from './axios';

export const searchNumbers = (country: string, areaCode?: string, type?: string) =>
  api.get('/phone-numbers/search', { params: { country, areaCode, type } });

export const listNumbers = () => api.get('/phone-numbers');
export const purchaseNumber = (phoneNumber: string, friendlyName?: string) =>
  api.post('/phone-numbers', { phoneNumber, friendlyName });
export const releaseNumber = (id: string) => api.delete(`/phone-numbers/${id}`);
export const updateNumber = (id: string, friendlyName: string) =>
  api.patch(`/phone-numbers/${id}`, { friendlyName });
