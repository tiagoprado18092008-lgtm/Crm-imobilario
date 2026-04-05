import api from './client';

export const listAppointments = (params?: any) => api.get('/appointments', { params });
export const getUpcoming = () => api.get('/appointments/upcoming');
export const getAppointment = (id: string) => api.get(`/appointments/${id}`);
export const createAppointment = (data: any) => api.post('/appointments', data);
export const updateAppointment = (id: string, data: any) => api.patch(`/appointments/${id}`, data);
export const deleteAppointment = (id: string) => api.delete(`/appointments/${id}`);
