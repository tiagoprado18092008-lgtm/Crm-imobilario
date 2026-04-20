import { create } from 'zustand'
import type { Device, Call } from '@twilio/voice-sdk'

export type CallStatus = 'idle' | 'connecting' | 'active' | 'incoming'

interface CallState {
  device: Device | null
  status: CallStatus
  activeCall: Call | null
  incomingCall: Call | null
  dialerOpen: boolean
  prefillNumber: string
  prefillContactId: string | null
  fromNumberId: string | null
  error: string | null

  setDevice: (d: Device | null) => void
  setStatus: (s: CallStatus) => void
  setActiveCall: (c: Call | null) => void
  setIncomingCall: (c: Call | null) => void
  openDialer: (number?: string, contactId?: string) => void
  closeDialer: () => void
  setFromNumberId: (id: string | null) => void
  setError: (msg: string | null) => void
  reset: () => void
}

export const useCallStore = create<CallState>((set) => ({
  device: null,
  status: 'idle',
  activeCall: null,
  incomingCall: null,
  dialerOpen: false,
  prefillNumber: '',
  prefillContactId: null,
  fromNumberId: null,
  error: null,

  setDevice: (device) => set({ device }),
  setStatus: (status) => set({ status }),
  setActiveCall: (activeCall) => set({ activeCall, status: activeCall ? 'active' : 'idle' }),
  setIncomingCall: (incomingCall) => set({ incomingCall, status: incomingCall ? 'incoming' : 'idle' }),
  openDialer: (number, contactId) => set({
    dialerOpen: true,
    prefillNumber: number || '',
    prefillContactId: contactId || null,
  }),
  closeDialer: () => set({ dialerOpen: false }),
  setFromNumberId: (fromNumberId) => set({ fromNumberId }),
  setError: (error) => set({ error }),
  reset: () => set({
    device: null,
    status: 'idle',
    activeCall: null,
    incomingCall: null,
    dialerOpen: false,
    prefillNumber: '',
    prefillContactId: null,
    fromNumberId: null,
    error: null,
  }),
}))
