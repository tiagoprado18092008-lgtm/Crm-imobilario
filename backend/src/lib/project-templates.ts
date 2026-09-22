/**
 * Project checklists.
 *
 * Winning a deal instantiates one of these. The point is not paperwork: it is
 * that the steps between "client said yes" and "work is live" are the ones
 * most often dropped, and they are always the same steps.
 */

export type TemplateTask = {
  title: string;
  description?: string;
  /** Working days after the project starts. */
  offsetDays: number;
};

export type ProjectTemplateDef = {
  name: string;
  type: 'WEBSITE' | 'ADS' | 'REDES_SOCIAIS' | 'SEO' | 'OUTRO';
  tasks: TemplateTask[];
};

/** What actually has to happen to ship a website. */
export const WEBSITE_TEMPLATE: ProjectTemplateDef = {
  name: 'Website',
  type: 'WEBSITE',
  tasks: [
    { title: 'Briefing com o cliente', description: 'Objetivos, público, referências e âmbito.', offsetDays: 1 },
    { title: 'Recolher acessos e domínio', description: 'Registar domínio ou obter acesso ao existente, alojamento e contas necessárias.', offsetDays: 2 },
    { title: 'Copy e conteúdos', description: 'Textos, fotografias e logótipo. O passo que mais atrasa entregas — pedir cedo.', offsetDays: 5 },
    { title: 'Design das páginas', offsetDays: 8 },
    { title: 'Desenvolvimento', offsetDays: 14 },
    { title: 'Revisão com o cliente', description: 'Apresentar em ambiente de pré-visualização e recolher alterações.', offsetDays: 17 },
    { title: 'Publicação', description: 'Apontar domínio, SSL, verificar em telemóvel e desktop.', offsetDays: 20 },
    { title: 'Formação ao cliente', description: 'Como editar conteúdos e onde ver as estatísticas.', offsetDays: 21 },
  ],
};

/** Ads: the first month is setup, and it is where the retainer is won or lost. */
export const ADS_TEMPLATE: ProjectTemplateDef = {
  name: 'Ads',
  type: 'ADS',
  tasks: [
    { title: 'Acessos a Google Ads e Meta', description: 'Pedir acesso às contas existentes ou criar novas em nome do cliente.', offsetDays: 1 },
    { title: 'Instalar pixel e tag', description: 'Google Tag e Meta Pixel no site, com conversões definidas.', offsetDays: 2 },
    { title: 'Estrutura de campanhas', description: 'Campanhas, grupos e palavras-chave ou públicos.', offsetDays: 4 },
    { title: 'Criativos e textos', offsetDays: 6 },
    { title: 'Arranque das campanhas', description: 'Publicar, confirmar entrega e verificar o rastreio de conversões.', offsetDays: 7 },
    { title: 'Relatório do primeiro mês', description: 'Resultados, custo por lead e o que muda no mês seguinte.', offsetDays: 30 },
  ],
};

export const SOCIAL_TEMPLATE: ProjectTemplateDef = {
  name: 'Redes Sociais',
  type: 'REDES_SOCIAIS',
  tasks: [
    { title: 'Acessos às redes', offsetDays: 1 },
    { title: 'Plano editorial do mês', offsetDays: 3 },
    { title: 'Produção de conteúdos', offsetDays: 6 },
    { title: 'Aprovação do cliente', offsetDays: 8 },
    { title: 'Agendamento das publicações', offsetDays: 9 },
    { title: 'Relatório mensal', offsetDays: 30 },
  ],
};

export const SEO_TEMPLATE: ProjectTemplateDef = {
  name: 'SEO',
  type: 'SEO',
  tasks: [
    { title: 'Auditoria inicial', offsetDays: 3 },
    { title: 'Pesquisa de palavras-chave', offsetDays: 5 },
    { title: 'Correções técnicas', offsetDays: 10 },
    { title: 'Google Business Profile', description: 'Perfil completo, fotografias e categorias — decisivo em clínicas.', offsetDays: 12 },
    { title: 'Otimização de conteúdo', offsetDays: 15 },
    { title: 'Relatório mensal', offsetDays: 30 },
  ],
};

export const DEFAULT_TEMPLATES = [
  WEBSITE_TEMPLATE,
  ADS_TEMPLATE,
  SOCIAL_TEMPLATE,
  SEO_TEMPLATE,
];

/**
 * Picks the template a won deal should use.
 *
 * Decided from the line items rather than the deal title: what was sold is a
 * fact, and a title is whatever someone typed. A deal carrying both a website
 * and a retainer opens two projects, because they are delivered by different
 * people on different clocks.
 */
export function templatesForLineItems(
  items: Array<{ name: string; revenueType?: string }>,
): ProjectTemplateDef[] {
  const matched = new Map<string, ProjectTemplateDef>();

  for (const item of items) {
    const name = item.name.toLowerCase();

    if (name.includes('website') || name.includes('site')) {
      matched.set('WEBSITE', WEBSITE_TEMPLATE);
    }
    if (name.includes('ads') || name.includes('google') || name.includes('meta')) {
      matched.set('ADS', ADS_TEMPLATE);
    }
    if (name.includes('redes') || name.includes('social') || name.includes('instagram')) {
      matched.set('REDES_SOCIAIS', SOCIAL_TEMPLATE);
    }
    if (name.includes('seo')) {
      matched.set('SEO', SEO_TEMPLATE);
    }
  }

  // Something was sold either way, so a deal we cannot classify still gets a
  // project — an unclassified one is better than none, which is invisible.
  if (matched.size === 0 && items.length > 0) {
    return [{ name: 'Projeto', type: 'OUTRO', tasks: [] }];
  }

  return [...matched.values()];
}

/** Turns template offsets into dates, skipping weekends. */
export function scheduleTasks(
  tasks: TemplateTask[],
  startDate: Date,
): Array<TemplateTask & { dueDate: Date }> {
  return tasks.map((task) => ({ ...task, dueDate: addWorkingDays(startDate, task.offsetDays) }));
}

function addWorkingDays(from: Date, days: number): Date {
  const out = new Date(from);
  let remaining = Math.max(0, days);
  while (remaining > 0) {
    out.setDate(out.getDate() + 1);
    const day = out.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return out;
}

/** The project's own due date: its last task. */
export function projectDueDate(tasks: TemplateTask[], startDate: Date): Date | null {
  if (tasks.length === 0) return null;
  const last = Math.max(...tasks.map((t) => t.offsetDays));
  return addWorkingDays(startDate, last);
}
