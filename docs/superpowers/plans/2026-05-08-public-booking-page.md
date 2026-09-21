# Public Booking Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar página pública de agendamento (tipo Calendly) onde um contacto pode escolher uma slot disponível com um consultor e agendar uma visita ou reunião, recebendo confirmação por email.

**Architecture:** URL pública `/book/:userId` sem autenticação. Backend expõe slots disponíveis (CalendarSlot) e cria Appointment. Email de confirmação enviado ao contacto. Consultor vê o agendamento no seu calendário CRM.

**Tech Stack:** Express (rota pública sem auth middleware), Prisma (CalendarSlot, Appointment, User), nodemailer, React (página pública sem AppShell).

---

### Task 1: Backend — Endpoint público de slots disponíveis

**Files:**
- Create: `backend/src/modules/calendar/booking.router.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Criar router de booking público**

Criar `backend/src/modules/calendar/booking.router.ts`:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import nodemailer from 'nodemailer';

const router = Router();

// GET /api/booking/:userId — perfil público do consultor + slots
router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true, phone: true, amiNumber: true },
    });
    if (!user) { res.status(404).json({ error: 'Consultor não encontrado' }); return; }

    const slots = await prisma.calendarSlot.findMany({
      where: { userId, isAvailable: true },
      orderBy: { dayOfWeek: 'asc' },
    });

    res.json({ user, slots });
  } catch (err) { next(err); }
});

// GET /api/booking/:userId/available?date=YYYY-MM-DD — slots disponíveis numa data
router.get('/:userId/available', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { date } = req.query as { date?: string };
    if (!date) { res.status(400).json({ error: 'Parâmetro date obrigatório (YYYY-MM-DD)' }); return; }

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay(); // 0=Sun, 6=Sat

    const slot = await prisma.calendarSlot.findFirst({
      where: { userId, dayOfWeek, isAvailable: true },
    });
    if (!slot) { res.json({ slots: [] }); return; }

    // Gerar slots de 1h entre startTime e endTime
    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH] = slot.endTime.split(':').map(Number);
    const times: string[] = [];
    for (let h = startH; h < endH; h++) {
      times.push(`${String(h).padStart(2, '0')}:${String(startM).padStart(2, '0')}`);
    }

    // Remover slots já ocupados
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);
    const existing = await prisma.appointment.findMany({
      where: {
        assignedToId: userId,
        startAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      select: { startAt: true },
    });
    const occupiedHours = new Set(existing.map((a: any) => {
      const d = new Date(a.startAt);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }));

    const available = times.filter(t => !occupiedHours.has(t));
    res.json({ slots: available, date });
  } catch (err) { next(err); }
});

// POST /api/booking/:userId/book — criar agendamento
router.post('/:userId/book', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { date, time, name, email, phone, notes, type } = req.body;

    if (!date || !time || !name || !email) {
      res.status(400).json({ error: 'date, time, name e email são obrigatórios' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, agencyId: true, locationId: true },
    });
    if (!user) { res.status(404).json({ error: 'Consultor não encontrado' }); return; }

    const startAt = new Date(`${date}T${time}:00`);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000); // +1h

    // Find or create contact
    let contact = await prisma.contact.findFirst({
      where: { email, ...(user.locationId ? { locationId: user.locationId } : {}) },
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          name, email, phone: phone || null,
          assignedToId: userId,
          locationId: user.locationId,
          source: 'Agendamento Online',
          type: 'LEAD',
        },
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        title: `${type === 'VISIT' ? 'Visita' : 'Reunião'} com ${name}`,
        description: notes || null,
        startAt, endAt,
        type: type || 'MEETING',
        status: 'SCHEDULED',
        assignedToId: userId,
        contactId: contact.id,
        locationId: user.locationId,
        notes: notes || null,
      },
    });

    // Send confirmation email to contact
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'CasaFlow'}" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: `Agendamento confirmado com ${user.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#0f2553">Agendamento confirmado ✓</h2>
            <p>Olá ${name},</p>
            <p>O teu agendamento foi confirmado com <strong>${user.name}</strong>:</p>
            <div style="background:#f8f9fc;border:1px solid #e5e9f2;border-radius:10px;padding:16px 20px;margin:16px 0">
              <p style="margin:0 0 8px"><strong>📅 Data:</strong> ${new Date(startAt).toLocaleDateString('pt-PT', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
              <p style="margin:0 0 8px"><strong>🕐 Hora:</strong> ${time}</p>
              <p style="margin:0"><strong>📍 Tipo:</strong> ${type === 'VISIT' ? 'Visita ao imóvel' : 'Reunião'}</p>
            </div>
            ${notes ? `<p><strong>Notas:</strong> ${notes}</p>` : ''}
            <p style="color:#888;font-size:12px">Em caso de necessidade de reagendamento, contacta-nos diretamente.</p>
          </div>
        `,
      });
    } catch { /* non-blocking */ }

    res.json({ appointment: { id: appointment.id, startAt, endAt }, message: 'Agendamento criado com sucesso.' });
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 2: Registar o router no servidor**

Em `backend/src/server.ts`, após os imports existentes, adicionar:
```typescript
import bookingRouter from './modules/calendar/booking.router';
```

E no bloco de rotas (antes ou após as rotas autenticadas):
```typescript
app.use('/api/booking', bookingRouter); // público — sem authenticate middleware
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/calendar/booking.router.ts backend/src/server.ts
git commit -m "feat(booking): add public booking API endpoints"
```

---

### Task 2: Frontend — API de booking

**Files:**
- Create: `frontend/src/api/booking.api.ts`

- [ ] **Step 1: Criar funções de API**

Criar `frontend/src/api/booking.api.ts`:

```typescript
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const getConsultorProfile = async (userId: string) => {
  const { data } = await axios.get(`${BASE}/booking/${userId}`);
  return data as { user: any; slots: any[] };
};

export const getAvailableSlots = async (userId: string, date: string): Promise<string[]> => {
  const { data } = await axios.get(`${BASE}/booking/${userId}/available`, { params: { date } });
  return data.slots;
};

export const createBooking = async (userId: string, payload: {
  date: string; time: string; name: string; email: string; phone?: string; notes?: string; type?: string;
}) => {
  const { data } = await axios.post(`${BASE}/booking/${userId}/book`, payload);
  return data;
};
```

> Nota: usa axios diretamente (sem o interceptor de auth) para ser verdadeiramente público.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/booking.api.ts
git commit -m "feat(booking): add public booking API client functions"
```

---

### Task 3: Frontend — Página pública de agendamento

**Files:**
- Create: `frontend/src/pages/PublicBookingPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Criar página de agendamento**

Criar `frontend/src/pages/PublicBookingPage.tsx`:

```tsx
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getConsultorProfile, getAvailableSlots, createBooking } from '../api/booking.api'
import { getInitials } from '../utils/formatters'

const DAY_LABELS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']

const inputSt: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid #dce3ef',
  fontSize: 14, color: '#0f2553', outline: 'none', background: '#f8f9fc', boxSizing: 'border-box',
}
const labelSt: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#6b7a99', display: 'block',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em',
}

export const PublicBookingPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Step state
  const [step, setStep] = useState<'date' | 'time' | 'form' | 'done'>('date')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '', type: 'MEETING' })
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')

  useEffect(() => {
    if (!userId) return
    getConsultorProfile(userId)
      .then(setProfile)
      .catch(() => setError('Consultor não encontrado.'))
      .finally(() => setLoading(false))
  }, [userId])

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date)
    setLoadingSlots(true)
    try {
      const slots = await getAvailableSlots(userId!, date)
      setAvailableSlots(slots)
      setStep('time')
    } catch { setAvailableSlots([]) }
    finally { setLoadingSlots(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email) { setBookingError('Nome e email são obrigatórios.'); return }
    setSubmitting(true); setBookingError('')
    try {
      await createBooking(userId!, { date: selectedDate, time: selectedTime, ...form })
      setStep('done')
    } catch (err: any) {
      setBookingError(err?.response?.data?.error || 'Erro ao agendar. Tenta novamente.')
    } finally { setSubmitting(false) }
  }

  // Generate next 14 days for date picker
  const availableDays = profile?.slots?.map((s: any) => s.dayOfWeek) ?? []
  const next14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1)
    return d
  }).filter(d => availableDays.includes(d.getDay()))

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc' }}>
      <div style={{ color: '#6b7a99', fontSize: 15 }}>A carregar…</div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc' }}>
      <div style={{ color: '#dc2626', fontSize: 15 }}>{error}</div>
    </div>
  )

  const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ minHeight: '100vh', background: '#f8f9fc', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {/* Header do consultor */}
        <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 16, padding: '24px 28px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
          {profile?.user?.avatarUrl ? (
            <img src={profile.user.avatarUrl} alt={profile.user.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0f2553', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20 }}>
              {getInitials(profile?.user?.name || '')}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#0f2553' }}>{profile?.user?.name}</div>
            <div style={{ fontSize: 13, color: '#6b7a99', marginTop: 2 }}>Consultor Imobiliário</div>
            {profile?.user?.amiNumber && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>AMI {profile.user.amiNumber}</div>}
          </div>
        </div>
        {children}
      </div>
    </div>
  )

  if (step === 'done') return (
    <PageWrapper>
      <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 16, padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: '#0f2553', margin: '0 0 10px', fontSize: 22 }}>Agendamento confirmado!</h2>
        <p style={{ color: '#6b7a99', fontSize: 14 }}>Enviámos um email de confirmação para <strong>{form.email}</strong>.</p>
        <p style={{ color: '#6b7a99', fontSize: 14, marginTop: 4 }}>
          <strong>📅</strong> {new Date(selectedDate).toLocaleDateString('pt-PT', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} às {selectedTime}
        </p>
      </div>
    </PageWrapper>
  )

  if (step === 'form') return (
    <PageWrapper>
      <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 16, padding: '24px 28px' }}>
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => setStep('time')} style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 13, padding: 0 }}>← Voltar</button>
          <h3 style={{ margin: '8px 0 4px', color: '#0f2553', fontSize: 18 }}>Os teus dados</h3>
          <p style={{ color: '#6b7a99', fontSize: 13, margin: 0 }}>
            {new Date(selectedDate).toLocaleDateString('pt-PT', { weekday:'long', day:'numeric', month:'long' })} às {selectedTime}
          </p>
        </div>
        {bookingError && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>{bookingError}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelSt}>Tipo de reunião</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputSt}>
              <option value="MEETING">Reunião</option>
              <option value="VISIT">Visita ao imóvel</option>
              <option value="CALL">Chamada telefónica</option>
            </select>
          </div>
          <div>
            <label style={labelSt}>Nome completo *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="O teu nome" style={inputSt} required />
          </div>
          <div>
            <label style={labelSt}>Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="o.teu@email.com" style={inputSt} required />
          </div>
          <div>
            <label style={labelSt}>Telefone</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+351 9XX XXX XXX" style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>Notas (opcional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Endereço do imóvel, dúvidas, etc." rows={3} style={{ ...inputSt, resize: 'vertical' }} />
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '13px', borderRadius: 9, border: 'none', background: '#0f2553', color: '#fff', fontWeight: 700, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, marginTop: 4 }}>
            {submitting ? 'A confirmar…' : 'Confirmar agendamento'}
          </button>
        </form>
      </div>
    </PageWrapper>
  )

  if (step === 'time') return (
    <PageWrapper>
      <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 16, padding: '24px 28px' }}>
        <button onClick={() => setStep('date')} style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 13, padding: '0 0 12px' }}>← Voltar</button>
        <h3 style={{ margin: '0 0 6px', color: '#0f2553', fontSize: 18 }}>Escolhe a hora</h3>
        <p style={{ color: '#6b7a99', fontSize: 13, margin: '0 0 20px' }}>
          {new Date(selectedDate).toLocaleDateString('pt-PT', { weekday:'long', day:'numeric', month:'long' })}
        </p>
        {loadingSlots && <div style={{ color: '#6b7a99', textAlign: 'center', padding: 20 }}>A carregar disponibilidade…</div>}
        {!loadingSlots && availableSlots.length === 0 && (
          <div style={{ color: '#6b7a99', textAlign: 'center', padding: 20, fontSize: 14 }}>Sem disponibilidade neste dia. Escolhe outra data.</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {availableSlots.map(slot => (
            <button key={slot} onClick={() => { setSelectedTime(slot); setStep('form') }}
              style={{ padding: '12px 8px', borderRadius: 9, border: '1.5px solid #dce3ef', background: '#f8f9fc', color: '#0f2553', fontWeight: 600, fontSize: 15, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = '#0f2553'; (e.target as HTMLElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = '#f8f9fc'; (e.target as HTMLElement).style.color = '#0f2553' }}>
              {slot}
            </button>
          ))}
        </div>
      </div>
    </PageWrapper>
  )

  // Step date
  return (
    <PageWrapper>
      <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 16, padding: '24px 28px' }}>
        <h3 style={{ margin: '0 0 6px', color: '#0f2553', fontSize: 18 }}>Agendar reunião</h3>
        <p style={{ color: '#6b7a99', fontSize: 13, margin: '0 0 20px' }}>Escolhe uma data disponível</p>
        {next14.length === 0 && (
          <p style={{ color: '#6b7a99', fontSize: 14 }}>Sem disponibilidade nos próximos 14 dias.</p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {next14.map(d => {
            const iso = d.toISOString().split('T')[0]
            return (
              <button key={iso} onClick={() => handleDateSelect(iso)}
                style={{ padding: '14px 10px', borderRadius: 10, border: '1.5px solid #dce3ef', background: '#f8f9fc', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{DAY_LABELS[d.getDay()]}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0f2553', marginTop: 2 }}>{d.getDate()}</div>
                <div style={{ fontSize: 11, color: '#6b7a99' }}>{d.toLocaleDateString('pt-PT', { month: 'short' })}</div>
              </button>
            )
          })}
        </div>
      </div>
    </PageWrapper>
  )
}
```

- [ ] **Step 2: Registar rota pública em App.tsx**

Em `frontend/src/App.tsx`, no bloco de rotas públicas (sem ProtectedRoute), adicionar:

```tsx
<Route path="/book/:userId" element={<PublicBookingPage />} />
```

E adicionar o import no topo:
```tsx
import { PublicBookingPage } from './pages/PublicBookingPage'
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/PublicBookingPage.tsx frontend/src/App.tsx frontend/src/api/booking.api.ts
git commit -m "feat(booking): public booking page at /book/:userId"
```

---

### Task 4: Frontend — Link de agendamento no perfil do consultor

**Files:**
- Modify: `frontend/src/pages/settings/GeneralSettingsPage.tsx`

- [ ] **Step 1: Mostrar e copiar link de booking**

Em `GeneralSettingsPage.tsx`, no final da secção de perfil, adicionar:

```tsx
{user && (
  <div style={{ marginTop: 16, padding: '14px 16px', background: '#f0f4ff', borderRadius: 10, border: '1px solid #c7d4f7' }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>O teu link de agendamento</div>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <code style={{ flex: 1, fontSize: 12, color: '#0f2553', wordBreak: 'break-all' }}>
        {window.location.origin}/book/{user.id}
      </code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(`${window.location.origin}/book/${user.id}`)
          showToast('Link copiado!', 'success')
        }}
        style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: '#0f2553', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        Copiar link
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/settings/GeneralSettingsPage.tsx
git commit -m "feat(booking): show shareable booking link in consultant profile settings"
```

---
