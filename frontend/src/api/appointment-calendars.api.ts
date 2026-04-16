import api from './client';

export interface AppointmentCalendar {
  id: string;
  name: string;
  color: string;
  description?: string;
  _count?: { appointments: number };
}

export const getCalendars = () => api.get<AppointmentCalendar[]>('/appointment-calendars');

export const createCalendar = (data: { name: string; color?: string; description?: string }) =>
  api.post<AppointmentCalendar>('/appointment-calendars', data);

export const updateCalendar = (id: string, data: { name?: string; color?: string; description?: string }) =>
  api.put<AppointmentCalendar>(`/appointment-calendars/${id}`, data);

export const deleteCalendar = (id: string) =>
  api.delete(`/appointment-calendars/${id}`);
