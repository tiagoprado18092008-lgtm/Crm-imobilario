import api from './axios';

export const listForms = () => api.get('/forms');
export const getForm = (id: string) => api.get(`/forms/${id}`);
export const createForm = (data: any) => api.post('/forms', data);
export const updateForm = (id: string, data: any) => api.patch(`/forms/${id}`, data);
export const deleteForm = (id: string) => api.delete(`/forms/${id}`);
