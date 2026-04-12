import api from './client';

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api';

// Integrations
export const getCalendarStatus = () => api.get('/calendar/status');
export const syncCalendar = () => api.post('/calendar/sync');

export const connectGoogle = (token: string) => {
  window.location.href = `${API_BASE}/calendar/google/auth?token=${encodeURIComponent(token)}`;
};

export const connectOutlook = (token: string) => {
  window.location.href = `${API_BASE}/calendar/outlook/auth?token=${encodeURIComponent(token)}`;
};

export const disconnectProvider = (provider: string) =>
  api.delete(`/calendar/${provider}/disconnect`);

export const getCalendarSlots = () => api.get('/calendar/slots');
export const updateCalendarSlots = (slots: any[]) => api.put('/calendar/slots', { slots });

// Events
export const listCalendarEvents = (params?: any) =>
  api.get('/calendar/events', { params });

export const getCalendarEvent = (id: string) => api.get(`/calendar/events/${id}`);

export const createCalendarEvent = (data: any) => api.post('/calendar/events', data);

export const updateCalendarEvent = (id: string, data: any) =>
  api.put(`/calendar/events/${id}`, data);

export const deleteCalendarEvent = (id: string) => api.delete(`/calendar/events/${id}`);

export const duplicateCalendarEvent = (id: string) =>
  api.post(`/calendar/events/${id}/duplicate`);
