import api from './client'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const createInvitation = (email: string, role: string) =>
  api.post('/invitations', { email, role })

export const listInvitations = () =>
  api.get('/invitations')

export const revokeInvitation = (id: string) =>
  api.delete(`/invitations/${id}`)

export const verifyInvitationToken = (token: string) =>
  axios.get(`${BASE}/invitations/verify/${token}`)

export const resendInvitation = (id: string) =>
  api.post(`/invitations/${id}/resend`)
