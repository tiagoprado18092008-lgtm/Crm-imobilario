/**
 * Stage entry rules and rotting.
 *
 * Two ideas from activity-based selling, made enforceable:
 *
 *  - A deal may not enter a stage without the facts that stage depends on. A
 *    proposal with no value is not a proposal, and discovering that at
 *    forecast time is too late.
 *  - A deal that sits in a stage past its threshold is rotting, and rotting is
 *    computed from a stored timestamp rather than recalculated per card on
 *    every board render.
 */

/** Fields a stage can require before a deal is allowed in. */
export const REQUIRABLE_FIELDS = {
  value: 'Valor',
  expectedCloseDate: 'Data de fecho prevista',
  contactId: 'Contacto',
  companyId: 'Empresa',
  nextActivityAt: 'Próxima atividade',
  lostReason: 'Motivo da perda',
} as const;

export type RequirableField = keyof typeof REQUIRABLE_FIELDS;

export type MissingField = { field: string; label: string };

/**
 * Returns the required fields a deal does not yet have.
 *
 * Empty means the move is allowed. The caller reports the list rather than a
 * bare refusal, so the person is told what to fill in, not merely that they
 * cannot proceed.
 */
export function missingRequiredFields(
  deal: Record<string, unknown>,
  requiredFields: unknown,
): MissingField[] {
  if (!Array.isArray(requiredFields) || requiredFields.length === 0) return [];

  const missing: MissingField[] = [];
  for (const raw of requiredFields) {
    const field = String(raw);
    const label = REQUIRABLE_FIELDS[field as RequirableField] ?? field;
    const value = deal[field];

    // 0 is a real value; null, undefined and "" are not.
    const isEmpty =
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '');

    if (isEmpty) missing.push({ field, label });
  }
  return missing;
}

export class StageRequirementError extends Error {
  status = 422;
  missing: MissingField[];
  stageName: string;

  constructor(stageName: string, missing: MissingField[]) {
    super(
      `Faltam campos obrigatórios para mover para "${stageName}": ${missing
        .map((m) => m.label)
        .join(', ')}`,
    );
    this.name = 'StageRequirementError';
    this.stageName = stageName;
    this.missing = missing;
  }
}

/**
 * When a deal entering a stage now would start rotting.
 *
 * Returns null when the stage has no threshold, or when the deal has a next
 * activity scheduled — a deal being actively worked is not rotting, however
 * long it has been in the stage.
 */
export function computeRottingAt(
  stageEnteredAt: Date,
  rotDays: number | null | undefined,
  nextActivityAt: Date | null | undefined,
): Date | null {
  if (!rotDays || rotDays <= 0) return null;
  if (nextActivityAt && nextActivityAt >= new Date()) return null;

  const rotsAt = new Date(stageEnteredAt);
  rotsAt.setDate(rotsAt.getDate() + rotDays);
  return rotsAt;
}

/** True when the deal has already crossed its threshold. */
export function isRotting(rottingAt: Date | null | undefined): boolean {
  return Boolean(rottingAt && rottingAt <= new Date());
}

/** Whole days the deal has been in its current stage. */
export function daysInStage(stageEnteredAt: Date | null | undefined): number {
  if (!stageEnteredAt) return 0;
  return Math.floor((Date.now() - stageEnteredAt.getTime()) / 86_400_000);
}
