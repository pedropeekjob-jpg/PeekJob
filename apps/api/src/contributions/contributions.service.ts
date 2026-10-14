import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { findPersonalAttacks, interviewStats, salaryBands, softenText, type CreateInterviewInput, type CreateSalaryInput } from '@peekjob/shared';
import { Pool } from 'pg';
import { isUuid } from '../common/zod';
import { isUniqueViolation, PG_POOL } from '../db/db.module';

/** Nomes de pessoas e insultos bloqueiam, como nas avaliações (com a mesma resposta 422) */
export function assertNoPersonalAttack(...texts: string[]) {
  const attack = findPersonalAttacks(texts.join('\n'));
  if (!attack.blocked) return;
  throw new UnprocessableEntityException({
    code: 'PERSONAL_ATTACK',
    message: 'Descreve situações, sem nomes nem insultos.',
    names: attack.names,
    insults: attack.insults,
    suggestion: softenText(texts.at(-1) ?? ''),
    rewriteAvailable: true,
  });
}

/** Entrevistas e salários: partilhar (com sessão) e ver agregado (público, só organizações ativas) */
@Injectable()
export class ContributionsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Aceita contributos para organizações ativas ou ainda por aprovar (como as avaliações) */
  private async assertOpen(orgId: string) {
    if (!isUuid(orgId)) throw new NotFoundException();
    const { rows } = await this.pool.query(`SELECT 1 FROM organizations WHERE id = $1 AND status IN ('active', 'pending')`, [orgId]);
    if (!rows[0]) throw new NotFoundException();
  }

  private async assertPublic(orgId: string) {
    if (!isUuid(orgId)) throw new NotFoundException();
    const { rows } = await this.pool.query(`SELECT status FROM organizations WHERE id = $1`, [orgId]);
    if (!rows[0]) throw new NotFoundException();
    return rows[0].status === 'active';
  }

  async createInterview(orgId: string, input: CreateInterviewInput, authorRef: string) {
    assertNoPersonalAttack(input.role, input.text);
    await this.assertOpen(orgId);
    try {
      const { rows } = await this.pool.query(
        `INSERT INTO interviews (org_id, author_ref, role, positive, offer, answered, difficulty, steps, text)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [orgId, authorRef, input.role, input.positive, input.offer, input.answered, input.difficulty, input.steps, input.text],
      );
      return { interview: toPublicInterview(rows[0]) };
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Já partilhaste uma entrevista nesta organização.');
      throw e;
    }
  }

  async listInterviews(orgId: string) {
    if (!(await this.assertPublic(orgId))) return { items: [], stats: null };
    const { rows } = await this.pool.query(
      `SELECT * FROM interviews WHERE org_id = $1 AND status = 'published' ORDER BY created_at DESC LIMIT 50`,
      [orgId],
    );
    const all = await this.pool.query(`SELECT positive, offer, answered, difficulty, steps FROM interviews WHERE org_id = $1 AND status = 'published' ORDER BY created_at`, [orgId]);
    return { items: rows.map(toPublicInterview), stats: interviewStats(all.rows) };
  }

  async saveSalary(orgId: string, input: CreateSalaryInput, authorRef: string) {
    assertNoPersonalAttack(input.role);
    await this.assertOpen(orgId);
    await this.pool.query(
      `INSERT INTO salaries (org_id, author_ref, role, monthly_gross, paid_on_time) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (org_id, author_ref) DO UPDATE
         SET role = EXCLUDED.role, monthly_gross = EXCLUDED.monthly_gross, paid_on_time = EXCLUDED.paid_on_time, updated_at = clock_timestamp()`,
      [orgId, authorRef, input.role, input.monthlyGross, input.paidOnTime],
    );
    return { ok: true };
  }

  async salaries(orgId: string) {
    if (!(await this.assertPublic(orgId))) return { bands: [], paidOnTimePct: null, total: 0 };
    const { rows } = await this.pool.query(
      `SELECT role, monthly_gross AS "monthlyGross", paid_on_time AS "paidOnTime" FROM salaries WHERE org_id = $1`,
      [orgId],
    );
    return { ...salaryBands(rows), total: rows.length };
  }
}

/** Forma pública de uma entrevista: nunca inclui quem a escreveu */
function toPublicInterview(r: Record<string, unknown>) {
  return {
    id: r.id,
    role: r.role,
    positive: r.positive,
    offer: r.offer,
    answered: r.answered,
    difficulty: r.difficulty,
    steps: r.steps,
    text: r.text,
    createdAt: r.created_at,
  };
}
