import axios from 'axios';

const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/booking`;

export interface ConsultorProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  amiNumber?: string;
}

export interface BookingPayload {
  date: string;
  time: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  type?: 'VISIT' | 'GENERAL_MEETING';
}

export const getConsultorProfile = async (userId: string): Promise<{ user: ConsultorProfile; slots: any[] }> => {
  const { data } = await axios.get(`${BASE}/${userId}`);
  return data;
};

export const getAvailableSlots = async (userId: string, date: string): Promise<string[]> => {
  const { data } = await axios.get(`${BASE}/${userId}/available`, { params: { date } });
  return data.slots;
};

export const createBooking = async (userId: string, payload: BookingPayload) => {
  const { data } = await axios.post(`${BASE}/${userId}/book`, payload);
  return data;
};
