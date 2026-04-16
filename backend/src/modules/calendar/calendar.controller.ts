import { Request, Response } from 'express';
import * as calendarService from './calendar.service';
import prisma from '../../config/database';
import { fetchAllGoogleEvents } from './sync';
import { importGoogleEventsAsAppointments } from './appointment-sync';

export const getStatus = async (req: Request, res: Response) => {
  try {
    const data = await calendarService.getStatus((req as any).user.id);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const sync = async (req: Request, res: Response) => {
  try {
    const data = await calendarService.manualSync((req as any).user.id);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const googleAuth = (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const url = calendarService.getGoogleAuthUrl(userId);
    res.redirect(url);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const googleCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    await calendarService.handleGoogleCallback(code, state);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/calendar/settings?connected=google`);
  } catch (err: any) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/calendar/settings?error=google`);
  }
};

export const outlookAuth = (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const url = calendarService.getOutlookAuthUrl(userId);
    res.redirect(url);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const outlookCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    await calendarService.handleOutlookCallback(code, state);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/calendar/settings?connected=outlook`);
  } catch (err: any) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/calendar/settings?error=outlook`);
  }
};

export const disconnect = async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    await calendarService.disconnectProvider((req as any).user.id, provider);
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const debugSync = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const calEventCount = await prisma.calendarEvent.count({ where: { userId, externalProvider: 'google' } });
    const apptGcalCount = await prisma.appointment.count({ where: { assignedToId: userId, description: { contains: 'gcal:' } } });
    const apptTotalCount = await prisma.appointment.count({ where: { assignedToId: userId } });
    const integration = await prisma.calendarIntegration.findFirst({ where: { userId, provider: 'google' } });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, agencyId: true } });

    res.json({
      userId,
      user,
      calEventCount,
      apptGcalCount,
      apptTotalCount,
      lastSyncedAt: integration?.lastSyncedAt,
      syncToken: integration?.syncToken ? 'exists' : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getSlots = async (req: Request, res: Response) => {
  try {
    const data = await calendarService.getSlots((req as any).user.id);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const upsertSlots = async (req: Request, res: Response) => {
  try {
    const data = await calendarService.upsertSlots((req as any).user.id, req.body.slots);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
};
