import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as ctrl from './properties.controller';

const router = Router();
router.use(authenticate);

// Upload storage — guarda em uploads/properties/:id/
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // ts-node (dev): __dirname = backend/src/modules/properties → ../../../../ = repo root
    // tsc (prod):    __dirname = backend/dist/src/modules/properties → ../../../../../ = repo root
    const repoRoot = fs.existsSync(path.resolve(__dirname, '../../../../uploads'))
      ? path.resolve(__dirname, '../../../../uploads')
      : path.resolve(__dirname, '../../../../../uploads');
    const dir = path.join(repoRoot, 'properties', req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const photoUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Formato não suportado'));
  },
});

const docUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Formato não suportado'));
  },
});

// Propriedades base
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.patch('/:id', ctrl.update);
router.delete('/:id', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN'), ctrl.remove);

// Fotos
router.post('/:id/photos', photoUpload.single('file'), ctrl.addPhoto);
router.patch('/:id/photos/reorder', ctrl.reorderPhotos);
router.patch('/:id/photos/:photoId', ctrl.updatePhoto);
router.delete('/:id/photos/:photoId', ctrl.deletePhoto);

// Documentos
router.post('/:id/documents', docUpload.single('file'), ctrl.addDocument);
router.delete('/:id/documents/:docId', ctrl.deleteDocument);

// Visitas
router.get('/:id/visits', ctrl.getVisits);
router.post('/:id/visits', ctrl.addVisit);
router.patch('/:id/visits/:visitId', ctrl.updateVisit);

// IA
router.post('/:id/generate-description', ctrl.generateDescription);

export default router;
