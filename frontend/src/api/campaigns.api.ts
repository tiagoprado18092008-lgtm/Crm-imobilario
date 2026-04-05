import api from './client';

export const listCampaigns = () => api.get('/campaigns');
export const getCampaign = (id: string) => api.get(`/campaigns/${id}`);
export const createCampaign = (data: any) => api.post('/campaigns', data);
export const updateCampaign = (id: string, data: any) => api.patch(`/campaigns/${id}`, data);
export const deleteCampaign = (id: string) => api.delete(`/campaigns/${id}`);
export const sendCampaign = (id: string) => api.post(`/campaigns/${id}/send`);
export const getCampaignStats = (id: string) => api.get(`/campaigns/${id}/stats`);
