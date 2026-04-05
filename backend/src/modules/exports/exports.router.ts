import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate);

const buildWhereClause = async (user: any): Promise<any> => {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'PRINCIPAL_CONSULTANT') {
    const subs = await prisma.user.findMany({ where: { supervisorId: user.id }, select: { id: true } });
    return { assignedToId: { in: [user.id, ...subs.map((s: any) => s.id)] } };
  }
  return { assignedToId: user.id };
};

// Export contacts as CSV
router.get('/contacts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where = await buildWhereClause((req as any).user);
    const contacts = await prisma.contact.findMany({ where, orderBy: { createdAt: 'desc' } });

    const header = 'Nome,Email,Telefone,WhatsApp,Tipo,Estado,Fonte,Criado em\n';
    const rows = contacts.map((c: any) =>
      `"${c.name}","${c.email || ''}","${c.phone || ''}","${c.whatsapp || ''}","${c.type}","${c.status}","${c.source || ''}","${c.createdAt.toISOString().slice(0, 10)}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=contactos_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send('\uFEFF' + header + rows); // BOM for Excel UTF-8
  } catch (err) { next(err); }
});

// Export opportunities as CSV
router.get('/opportunities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where = await buildWhereClause((req as any).user);
    const opps = await prisma.opportunity.findMany({
      where,
      include: { contact: { select: { name: true } }, assignedTo: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Título,Fase,Valor,Fonte,Contacto,Responsável,Data Criação\n';
    const rows = opps.map((o: any) =>
      `"${o.title}","${o.stage}","${o.value || ''}","${o.source || ''}","${o.contact?.name || ''}","${o.assignedTo?.name || ''}","${o.createdAt.toISOString().slice(0, 10)}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=oportunidades_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send('\uFEFF' + header + rows);
  } catch (err) { next(err); }
});

// Export tasks as CSV
router.get('/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where = await buildWhereClause((req as any).user);
    const tasks = await prisma.task.findMany({
      where,
      include: { contact: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    });

    const header = 'Título,Descrição,Prioridade,Estado,Prazo,Contacto\n';
    const rows = tasks.map((t: any) =>
      `"${t.title}","${t.description || ''}","${t.priority}","${t.status}","${t.dueDate?.toISOString().slice(0, 10) || ''}","${t.contact?.name || ''}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=tarefas_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send('\uFEFF' + header + rows);
  } catch (err) { next(err); }
});

export default router;
