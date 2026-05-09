import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import nodemailer from 'nodemailer';

const router = Router();

// GET /api/booking/:userId — public profile + calendar slots
router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true, phone: true },
    });
    if (!user) { res.status(404).json({ error: 'Consultor não encontrado' }); return; }

    const slots = await prisma.calendarSlot.findMany({
      where: { userId, isAvailable: true },
      orderBy: { dayOfWeek: 'asc' },
    });

    res.json({ user, slots });
  } catch (err) { next(err); }
});

// GET /api/booking/:userId/available?date=YYYY-MM-DD
router.get('/:userId/available', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { date } = req.query as { date?: string };
    if (!date) { res.status(400).json({ error: 'Parâmetro date obrigatório (YYYY-MM-DD)' }); return; }

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    const slot = await prisma.calendarSlot.findFirst({
      where: { userId, dayOfWeek, isAvailable: true },
    });
    if (!slot) { res.json({ slots: [] }); return; }

    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH] = slot.endTime.split(':').map(Number);
    const times: string[] = [];
    for (let h = startH; h < endH; h++) {
      times.push(`${String(h).padStart(2, '0')}:${String(startM).padStart(2, '0')}`);
    }

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

// POST /api/booking/:userId/book
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
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    let contact = await prisma.contact.findFirst({
      where: { email, ...(user.locationId ? { locationId: user.locationId } : user.agencyId ? { assignedTo: { agencyId: user.agencyId } } : {}) },
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          name, email, phone: phone || null,
          assignedToId: userId,
          locationId: user.locationId || null,
          source: 'Agendamento Online',
          type: 'BUYER' as any,
        },
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        title: `${type === 'VISIT' ? 'Visita' : 'Reunião'} com ${name}`,
        description: notes || null,
        startAt, endAt,
        type: type || 'GENERAL_MEETING',
        status: 'SCHEDULED',
        assignedToId: userId,
        contactId: contact.id,
        locationId: user.locationId || null,
        notes: notes || null,
      },
    });

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
