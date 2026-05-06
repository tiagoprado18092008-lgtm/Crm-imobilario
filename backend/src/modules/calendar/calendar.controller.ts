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
    const { code, state, error: oauthError } = req.query as { code?: string; state?: string; error?: string };
    if (oauthError) {
      console.error('[GoogleOAuth] Provider returned error:', oauthError);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/calendar/settings?error=google`);
    }
    if (!code || !state) {
      console.error('[GoogleOAuth] Missing code or state in callback', { hasCode: !!code, hasState: !!state });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/calendar/settings?error=google`);
    }
    await calendarService.handleGoogleCallback(code, state);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/calendar/settings?connected=google`);
  } catch (err: any) {
    const googleErr = err?.response?.data?.error || err?.message || 'unknown';
    console.error('[GoogleOAuth] Callback failed — google error:', googleErr);
    console.error('[GoogleOAuth] Callback failed — message:', err?.message);
    console.error('[GoogleOAuth] Callback failed — stack:', err?.stack);
    console.error('[GoogleOAuth] Callback failed — response data:', JSON.stringify(err?.response?.data));
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const reason = encodeURIComponent(String(googleErr).slice(0, 120));
    res.redirect(`${frontendUrl}/calendar/settings?error=google&reason=${reason}`);
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
    const { code, state, error: oauthError } = req.query as { code?: string; state?: string; error?: string };
    if (oauthError) {
      console.error('[OutlookOAuth] Provider returned error:', oauthError);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/calendar/settings?error=outlook`);
    }
    if (!code || !state) {
      console.error('[OutlookOAuth] Missing code or state in callback', { hasCode: !!code, hasState: !!state });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/calendar/settings?error=outlook`);
    }
    await calendarService.handleOutlookCallback(code, state);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/calendar/settings?connected=outlook`);
  } catch (err: any) {
    const msErr = err?.response?.data?.error || err?.message || 'unknown';
    console.error('[OutlookOAuth] Callback failed:', err?.response?.data || err?.message || err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const reason = encodeURIComponent(String(msErr).slice(0, 120));
    res.redirect(`${frontendUrl}/calendar/settings?error=outlook&reason=${reason}`);
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
