import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate);

const buildScope = async (user: any) => {
  if (user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN') {
    if (user.agencyId) return { assignedTo: { agencyId: user.agencyId } };
    return { assignedToId: user.id };
  }
  if (user.role === 'TEAM_LEADER' || user.role === 'PRINCIPAL_CONSULTANT') {
    const subs = await prisma.user.findMany({ where: { supervisorId: user.id }, select: { id: true } });
    return { assignedToId: { in: [user.id, ...subs.map((s: any) => s.id)] } };
  }
  return { assignedToId: user.id };
};

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) { res.json({ contacts: [], opportunities: [] }); return; }

    const user = (req as any).user;
    const scope = await buildScope(user);
    const search = { contains: q, mode: 'insensitive' as const };

    const [contacts, opportunities] = await Promise.all([
      prisma.contact.findMany({
        where: { ...scope, OR: [{ name: search }, { email: search }, { phone: search }] },
        select: { id: true, name: true, email: true, phone: true, type: true },
        take: 5,
      }),
      prisma.opportunity.findMany({
        where: { ...scope, OR: [{ title: search }] },
        select: { id: true, title: true, stage: true, value: true },
        take: 5,
      }),
    ]);

    res.json({ contacts, opportunities });
  } catch (err) { next(err); }
});

export default router;
