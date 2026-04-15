import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as agencyController from './agency.controller';
import prisma from '../../config/database';
import { logActivity } from '../../lib/activity-logger';

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const repoRoot = fs.existsSync(path.resolve(__dirname, '../../../../uploads'))
      ? path.resolve(__dirname, '../../../../uploads')
      : path.resolve(__dirname, '../../../../../uploads');
    const dir = path.join(repoRoot, 'agency', (_req as any).params?.id ?? 'misc');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  },
});
const logoUpload = multer({ storage: logoStorage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.use(authenticate);

// Current user's agency
router.get('/me', agencyController.getMyAgency);

// Create agency — only AGENCY_OWNER can create (first-time setup)
router.post('/', requireRole('AGENCY_OWNER'), agencyController.create);

// Get agency by id
router.get('/:id', agencyController.getById);

// Update agency — managers only
router.put('/:id', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN'), agencyController.update);

// Upload logo
router.post('/:id/logo', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN'), logoUpload.single('file'), agencyController.uploadLogo);

// Regenerate API key
router.post('/:id/regenerate-api-key', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN'), agencyController.regenerateApiKey);

// List members of an agency
router.get('/:id/members', agencyController.listMembers);

// Assign a user to agency — managers only
router.post('/:id/members', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN'), agencyController.assignUser);

// Impersonation
router.post('/impersonate/:userId', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN'), async (req, res) => {
  const { userId } = req.params;
  const user = req.user;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, agencyId: true, locationId: true, avatarUrl: true, permissions: true, isActive: true },
  });
  if (!target || !target.isActive || target.agencyId !== user.agencyId) {
    res.status(403).json({ error: 'Utilizador não encontrado ou de outra agência', status: 403 });
    return;
  }
  logActivity({
    userId: user.id,
    agencyId: user.agencyId,
    action: 'impersonation.started',
    entityType: 'User',
    entityId: userId,
    metadata: { impersonatedBy: user.id, impersonatedUser: target.email },
    ip: req.ip,
  });
  res.json(target);
});

router.post('/impersonate/exit', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN'), async (req, res) => {
  logActivity({
    userId: req.user.id,
    agencyId: req.user.agencyId,
    action: 'impersonation.ended',
    metadata: { realUser: req.user.id },
    ip: req.ip,
  });
  res.json({ success: true });
});

// Agency settings
router.get('/settings', async (req, res) => {
  const user = req.user;
  if (!user.agencyId) { res.status(400).json({ error: 'Sem agência' }); return; }
  let settings = await prisma.agencySettings.findUnique({ where: { agencyId: user.agencyId } });
  if (!settings) {
    settings = await prisma.agencySettings.create({
      data: { agencyId: user.agencyId, defaultPermissions: {}, securitySettings: {} }
    });
  }
  res.json(settings);
});

router.put('/settings', async (req, res) => {
  const user = req.user;
  if (!user.agencyId) { res.status(400).json({ error: 'Sem agência' }); return; }
  const settings = await prisma.agencySettings.upsert({
    where: { agencyId: user.agencyId },
    update: req.body,
    create: { agencyId: user.agencyId, ...req.body },
  });
  res.json(settings);
});

export default router;
