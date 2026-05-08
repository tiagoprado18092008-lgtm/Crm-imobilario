import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getConsultorProfile, getAvailableSlots, createBooking, ConsultorProfile } from '../api/booking.api';

type Step = 'date' | 'time' | 'form' | 'done';

const DAYS_AHEAD = 30;

function formatDateLabel(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function generateNext30Days() {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function PublicBookingPage() {
  const { userId } = useParams<{ userId: string }>();
  const [step, setStep] = useState<Step>('date');
  const [profile, setProfile] = useState<ConsultorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');

  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '', type: 'GENERAL_MEETING' as 'VISIT' | 'GENERAL_MEETING' });
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const days = generateNext30Days();

  useEffect(() => {
    if (!userId) return;
    getConsultorProfile(userId)
      .then(d => setProfile(d.user))
      .catch(() => setError('Consultor não encontrado.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const selectDate = async (date: string) => {
    setSelectedDate(date);
    setLoadingSlots(true);
    try {
      const slots = await getAvailableSlots(userId!, date);
      setAvailableSlots(slots);
      setStep('time');
    } catch {
      setAvailableSlots([]);
      setStep('time');
    } finally {
      setLoadingSlots(false);
    }
  };

  const selectTime = (time: string) => {
    setSelectedTime(time);
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSubmitting(true);
    setBookingError('');
    try {
      await createBooking(userId!, {
        date: selectedDate,
        time: selectedTime,
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
        type: form.type,
      });
      setStep('done');
    } catch {
      setBookingError('Erro ao criar agendamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc' }}>
      <p style={{ color: '#6b7a99' }}>A carregar…</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc' }}>
      <p style={{ color: '#ef4444' }}>{error}</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fc', padding: '40px 16px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', marginBottom: 12 }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#0f2553', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28, color: '#fff', fontWeight: 700 }}>
              {profile?.name?.[0]?.toUpperCase()}
            </div>
          )}
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f2553', margin: '0 0 4px' }}>{profile?.name}</h1>
          {profile?.amiNumber && <p style={{ fontSize: 13, color: '#6b7a99', margin: 0 }}>AMI {profile.amiNumber}</p>}
          {profile?.phone && <p style={{ fontSize: 13, color: '#6b7a99', margin: '2px 0 0' }}>{profile.phone}</p>}
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 28 }}>

          {/* Step: date */}
          {step === 'date' && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Escolhe uma data</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {days.map(d => (
                  <button key={d} onClick={() => selectDate(d)} style={{
                    padding: '10px 6px', borderRadius: 10, border: '1.5px solid #e5e9f2',
                    background: '#fff', cursor: 'pointer', fontSize: 12, color: '#0f2553', fontWeight: 500,
                    textAlign: 'center',
                  }}>
                    {new Date(d + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step: time */}
          {step === 'time' && (
            <>
              <button onClick={() => setStep('date')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7a99', fontSize: 13, marginBottom: 12, padding: 0 }}>← Voltar</button>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>Escolhe uma hora</h2>
              <p style={{ fontSize: 13, color: '#6b7a99', marginBottom: 16 }}>{formatDateLabel(selectedDate)}</p>
              {loadingSlots ? (
                <p style={{ color: '#6b7a99', textAlign: 'center' }}>A verificar disponibilidade…</p>
              ) : availableSlots.length === 0 ? (
                <p style={{ color: '#ef4444', textAlign: 'center' }}>Sem horários disponíveis neste dia.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {availableSlots.map(t => (
                    <button key={t} onClick={() => selectTime(t)} style={{
                      padding: '12px 6px', borderRadius: 10, border: '1.5px solid #e5e9f2',
                      background: '#fff', cursor: 'pointer', fontSize: 14, color: '#0f2553', fontWeight: 600,
                    }}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step: form */}
          {step === 'form' && (
            <>
              <button onClick={() => setStep('time')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7a99', fontSize: 13, marginBottom: 12, padding: 0 }}>← Voltar</button>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>Os teus dados</h2>
              <p style={{ fontSize: 13, color: '#6b7a99', marginBottom: 20 }}>
                {formatDateLabel(selectedDate)} às {selectedTime}
              </p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Nome *
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e9f2', fontSize: 14, boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Email *
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e9f2', fontSize: 14, boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Telefone
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e9f2', fontSize: 14, boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Tipo de reunião
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e9f2', fontSize: 14, boxSizing: 'border-box', background: '#fff' }}>
                    <option value="GENERAL_MEETING">Reunião</option>
                    <option value="VISIT">Visita ao imóvel</option>
                  </select>
                </label>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Notas (opcional)
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e9f2', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
                </label>
                {bookingError && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{bookingError}</p>}
                <button type="submit" disabled={submitting} style={{
                  padding: '12px', borderRadius: 10, border: 'none', background: '#0f2553', color: '#fff',
                  fontSize: 15, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
                }}>
                  {submitting ? 'A confirmar…' : 'Confirmar agendamento'}
                </button>
              </form>
            </>
          )}

          {/* Step: done */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f2553', marginBottom: 8 }}>Agendamento confirmado!</h2>
              <p style={{ color: '#6b7a99', fontSize: 14 }}>
                Receberás um email de confirmação em breve.<br />
                <strong>{formatDateLabel(selectedDate)}</strong> às <strong>{selectedTime}</strong>
              </p>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#b0b7c3', marginTop: 24 }}>Powered by CasaFlow</p>
      </div>
    </div>
  );
}
