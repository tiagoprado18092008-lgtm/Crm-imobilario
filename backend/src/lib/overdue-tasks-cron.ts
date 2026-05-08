import cron from 'node-cron';
import prisma from '../config/database';
import nodemailer from 'nodemailer';

const getTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export const startOverdueTasksCron = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('[overdue-tasks] A verificar tarefas em atraso…');
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const overdueTasks = await prisma.task.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: today },
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          contact: { select: { name: true } },
        },
      });

      const byUser: Record<string, typeof overdueTasks> = {};
      for (const task of overdueTasks) {
        if (!task.assignedTo?.email) continue;
        const key = task.assignedTo.email;
        if (!byUser[key]) byUser[key] = [];
        byUser[key].push(task);
      }

      const transporter = getTransporter();

      for (const [email, tasks] of Object.entries(byUser)) {
        const user = tasks[0].assignedTo!;
        const taskRows = tasks.map(t => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee">${t.title}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee">${t.contact?.name || '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#dc2626">
              ${t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-PT') : '—'}
            </td>
          </tr>
        `).join('');

        await transporter.sendMail({
          from: `"${process.env.FROM_NAME || 'CasaFlow'}" <${process.env.FROM_EMAIL}>`,
          to: email,
          subject: `⚠️ Tens ${tasks.length} tarefa(s) em atraso — CasaFlow`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto">
              <h2 style="color:#0f2553">Tarefas em atraso</h2>
              <p>Olá ${user.name},</p>
              <p>Tens <strong>${tasks.length} tarefa(s)</strong> com prazo ultrapassado:</p>
              <table style="width:100%;border-collapse:collapse;border:1px solid #eee">
                <thead>
                  <tr style="background:#f8f9fc">
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7a99;text-transform:uppercase">Tarefa</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7a99;text-transform:uppercase">Contacto</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7a99;text-transform:uppercase">Prazo</th>
                  </tr>
                </thead>
                <tbody>${taskRows}</tbody>
              </table>
              <p style="margin-top:20px">
                <a href="${process.env.CLIENT_URL}/tasks" style="display:inline-block;padding:10px 22px;background:#0f2553;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
                  Ver tarefas
                </a>
              </p>
              <p style="color:#888;font-size:12px">CasaFlow CRM</p>
            </div>
          `,
        });

        console.log(`[overdue-tasks] Email enviado para ${email} (${tasks.length} tarefas)`);
      }
    } catch (err) {
      console.error('[overdue-tasks] Erro:', err);
    }
  }, { timezone: 'Europe/Lisbon' });

  console.log('[overdue-tasks] Cron agendado para 08:00 diariamente');
};
