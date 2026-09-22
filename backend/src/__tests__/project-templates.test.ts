import {
  templatesForLineItems,
  scheduleTasks,
  projectDueDate,
  WEBSITE_TEMPLATE,
  ADS_TEMPLATE,
  DEFAULT_TEMPLATES,
} from '../lib/project-templates';

describe('templatesForLineItems', () => {
  it('picks the website template for a website sale', () => {
    const t = templatesForLineItems([{ name: 'Website' }]);
    expect(t).toHaveLength(1);
    expect(t[0].type).toBe('WEBSITE');
  });

  it('picks ads for setup and for management alike', () => {
    expect(templatesForLineItems([{ name: 'Ads Setup' }])[0].type).toBe('ADS');
    expect(templatesForLineItems([{ name: 'Gestão de Ads' }])[0].type).toBe('ADS');
  });

  it('opens two projects when a deal sells both', () => {
    // A website and a retainer are delivered by different people on different
    // clocks, so they are not one project.
    const t = templatesForLineItems([
      { name: 'Website', revenueType: 'ONE_OFF' },
      { name: 'Gestão de Ads', revenueType: 'RECORRENTE' },
    ]);
    expect(t.map((x) => x.type).sort()).toEqual(['ADS', 'WEBSITE']);
  });

  it('does not open the same project twice for two related lines', () => {
    const t = templatesForLineItems([{ name: 'Ads Setup' }, { name: 'Gestão de Ads' }]);
    expect(t).toHaveLength(1);
  });

  it('matches regardless of case or wording', () => {
    expect(templatesForLineItems([{ name: 'SITE INSTITUCIONAL' }])[0].type).toBe('WEBSITE');
    expect(templatesForLineItems([{ name: 'seo local' }])[0].type).toBe('SEO');
    expect(templatesForLineItems([{ name: 'Redes sociais' }])[0].type).toBe('REDES_SOCIAIS');
  });

  it('still opens a project for something it cannot classify', () => {
    // Something was sold. An unclassified project beats none, which is
    // invisible and therefore never delivered.
    const t = templatesForLineItems([{ name: 'Consultoria avulsa' }]);
    expect(t).toHaveLength(1);
    expect(t[0].type).toBe('OUTRO');
  });

  it('opens nothing for a deal with no line items', () => {
    expect(templatesForLineItems([])).toEqual([]);
  });
});

describe('scheduleTasks', () => {
  // 2026-09-21 is a Monday.
  const monday = new Date('2026-09-21T09:00:00');

  it('turns offsets into dates', () => {
    const scheduled = scheduleTasks(
      [{ title: 'A', offsetDays: 1 }, { title: 'B', offsetDays: 3 }],
      monday,
    );
    expect(scheduled[0].dueDate.getDate()).toBe(22);
    expect(scheduled[1].dueDate.getDate()).toBe(24);
  });

  it('skips weekends, so nothing is due on a Saturday', () => {
    // Monday + 5 working days is the following Monday, not Saturday.
    const scheduled = scheduleTasks([{ title: 'A', offsetDays: 5 }], monday);
    expect(scheduled[0].dueDate.getDay()).toBe(1);
    expect(scheduled[0].dueDate.getDate()).toBe(28);
  });

  it('keeps the task fields intact', () => {
    const scheduled = scheduleTasks(
      [{ title: 'Briefing', description: 'Âmbito', offsetDays: 1 }],
      monday,
    );
    expect(scheduled[0]).toMatchObject({ title: 'Briefing', description: 'Âmbito' });
  });

  it('handles a zero offset as the start date', () => {
    expect(scheduleTasks([{ title: 'A', offsetDays: 0 }], monday)[0].dueDate.getDate()).toBe(21);
  });
});

describe('projectDueDate', () => {
  const monday = new Date('2026-09-21T09:00:00');

  it('is the date of the last task', () => {
    const due = projectDueDate([{ title: 'A', offsetDays: 1 }, { title: 'B', offsetDays: 10 }], monday);
    expect(due).not.toBeNull();
    // Ten working days from a Monday is a Monday a fortnight later.
    expect(due!.getDay()).toBe(1);
  });

  it('is not determined by task order', () => {
    const a = projectDueDate([{ title: 'A', offsetDays: 10 }, { title: 'B', offsetDays: 2 }], monday);
    const b = projectDueDate([{ title: 'B', offsetDays: 2 }, { title: 'A', offsetDays: 10 }], monday);
    expect(a!.getTime()).toBe(b!.getTime());
  });

  it('is null for a template with no tasks', () => {
    expect(projectDueDate([], monday)).toBeNull();
  });
});

describe('the shipped templates', () => {
  it('cover the four things AlphaScale sells', () => {
    expect(DEFAULT_TEMPLATES.map((t) => t.type).sort()).toEqual([
      'ADS', 'REDES_SOCIAIS', 'SEO', 'WEBSITE',
    ]);
  });

  it('start every template with getting access or a briefing', () => {
    // Nothing can be delivered before someone hands over the accounts, and
    // that is the step most often left until it blocks everything else.
    for (const template of DEFAULT_TEMPLATES) {
      expect(template.tasks[0].title.toLowerCase()).toMatch(/acesso|briefing|auditoria/);
    }
  });

  it('order tasks by when they are due', () => {
    for (const template of DEFAULT_TEMPLATES) {
      const offsets = template.tasks.map((t) => t.offsetDays);
      // Reporting tasks sit at the end of a month, so only check the run-up.
      const upToDelivery = offsets.filter((o) => o < 30);
      expect([...upToDelivery].sort((a, b) => a - b)).toEqual(upToDelivery);
    }
  });

  it('ends the website template with publishing and training', () => {
    const titles = WEBSITE_TEMPLATE.tasks.map((t) => t.title.toLowerCase());
    expect(titles.some((t) => t.includes('publicação'))).toBe(true);
    expect(titles[titles.length - 1]).toMatch(/formação/);
  });

  it('has the ads template install tracking before launching', () => {
    // Launching without conversion tracking spends the budget and learns
    // nothing from it.
    const titles = ADS_TEMPLATE.tasks.map((t) => t.title.toLowerCase());
    const pixel = titles.findIndex((t) => t.includes('pixel'));
    const launch = titles.findIndex((t) => t.includes('arranque'));
    expect(pixel).toBeLessThan(launch);
  });
});
