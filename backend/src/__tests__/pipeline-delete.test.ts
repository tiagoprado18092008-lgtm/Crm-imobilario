jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    pipeline: { findFirst: jest.fn(), delete: jest.fn() },
    opportunity: { count: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
    activityLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
  },
}));

import prisma from '../config/database';
import { remove } from '../modules/pipelines/pipelines.service';

const db = prisma as any;

const owner = { id: 'u1', role: 'AGENCY_OWNER', agencyId: 'ag1' };
const consultant = { id: 'u2', role: 'CONSULTANT', agencyId: 'ag1' };

const clinicas = {
  id: 'p-clinicas', name: 'Clinicas', agencyId: 'ag1',
  stages: [
    { id: 'c-lead', name: 'Lead Novo' },
    { id: 'c-odd', name: 'nao atendido' },
  ],
};
const geral = {
  id: 'p-geral', name: 'Geral', agencyId: 'ag1',
  stages: [
    { id: 'g-first', name: 'Primeiro Contacto' },
    { id: 'g-lead', name: 'Lead Novo' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  // getById scopes by agency, so a pipeline of another workspace is not found.
  db.pipeline.findFirst.mockImplementation(async ({ where }: any) =>
    [clinicas, geral].find((p) => p.id === where.id && p.agencyId === where.agencyId) ?? null,
  );
});

describe('deleting a pipeline', () => {
  it('deletes an empty pipeline straight away', async () => {
    db.opportunity.count.mockResolvedValue(0);
    await expect(remove('p-clinicas', owner)).resolves.toEqual({ moved: 0, deleted: 0 });
    expect(db.pipeline.delete).toHaveBeenCalledWith({ where: { id: 'p-clinicas' } });
  });

  it('refuses a pipeline with deals when not told what to do with them, and says how many', async () => {
    db.opportunity.count.mockResolvedValue(409);
    await expect(remove('p-clinicas', owner)).rejects.toMatchObject({ status: 409, count: 409 });
    expect(db.pipeline.delete).not.toHaveBeenCalled();
    expect(db.opportunity.deleteMany).not.toHaveBeenCalled();
  });

  it('counts only the deals of the caller\'s workspace', async () => {
    db.opportunity.count.mockResolvedValue(0);
    await remove('p-clinicas', owner);
    expect(db.opportunity.count).toHaveBeenCalledWith({ where: { pipelineId: 'p-clinicas', agencyId: 'ag1' } });
  });

  it('moves the deals to the stage of the same name, the rest to the first stage', async () => {
    db.opportunity.count.mockResolvedValue(409);
    await expect(remove('p-clinicas', owner, { moveTo: 'p-geral' })).resolves.toEqual({ moved: 409, deleted: 0 });

    const moves = db.opportunity.updateMany.mock.calls.map(([arg]: any) => arg);
    expect(moves).toContainEqual({
      where: { pipelineId: 'p-clinicas', stageId: 'c-lead', agencyId: 'ag1' },
      data: { pipelineId: 'p-geral', stageId: 'g-lead' },
    });
    expect(moves).toContainEqual({
      where: { pipelineId: 'p-clinicas', stageId: 'c-odd', agencyId: 'ag1' },
      data: { pipelineId: 'p-geral', stageId: 'g-first' },
    });
    // Deals with no stage of this pipeline are swept up last.
    expect(moves[moves.length - 1]).toEqual({
      where: { pipelineId: 'p-clinicas', agencyId: 'ag1' },
      data: { pipelineId: 'p-geral', stageId: 'g-first' },
    });
    expect(db.pipeline.delete).toHaveBeenCalledWith({ where: { id: 'p-clinicas' } });
    expect(db.opportunity.deleteMany).not.toHaveBeenCalled();
  });

  it('will not move deals into the pipeline being deleted', async () => {
    db.opportunity.count.mockResolvedValue(3);
    await expect(remove('p-clinicas', owner, { moveTo: 'p-clinicas' })).rejects.toMatchObject({ status: 400 });
    expect(db.pipeline.delete).not.toHaveBeenCalled();
  });

  it('will not move deals into another workspace\'s pipeline', async () => {
    db.opportunity.count.mockResolvedValue(3);
    const otherAgency = { ...owner, agencyId: 'ag2' };
    await expect(remove('p-clinicas', otherAgency, { moveTo: 'p-geral' })).rejects.toMatchObject({ status: 404 });
    expect(db.opportunity.updateMany).not.toHaveBeenCalled();
  });

  it('deletes the deals with the pipeline when asked by a manager', async () => {
    db.opportunity.count.mockResolvedValue(409);
    await expect(remove('p-clinicas', owner, { deleteOpportunities: true })).resolves.toEqual({ moved: 0, deleted: 409 });
    expect(db.opportunity.deleteMany).toHaveBeenCalledWith({ where: { pipelineId: 'p-clinicas', agencyId: 'ag1' } });
    expect(db.pipeline.delete).toHaveBeenCalledWith({ where: { id: 'p-clinicas' } });
  });

  it('does not let a consultant delete deals in bulk', async () => {
    db.opportunity.count.mockResolvedValue(409);
    await expect(remove('p-clinicas', consultant, { deleteOpportunities: true })).rejects.toMatchObject({ status: 403 });
    expect(db.opportunity.deleteMany).not.toHaveBeenCalled();
    expect(db.pipeline.delete).not.toHaveBeenCalled();
  });
});
