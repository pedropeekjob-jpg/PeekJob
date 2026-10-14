import { Body, Controller, Delete, Get, HttpCode, Inject, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { clearSessionCookie } from '../auth/session';
import { privacySecret, userRef } from '../common/privacy';
import { parse } from '../common/zod';
import { PG_POOL, tx } from '../db/db.module';

const DeleteBody = z.object({ keepReviews: z.boolean().default(false) });

/** RGPD: direito de acesso (exportar) e direito ao apagamento (apagar a conta). */
@Controller('me')
@UseGuards(AuthGuard)
export class AccountController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get('export')
  async export(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const ref = userRef(privacySecret(), user.id);
    const q = (sql: string, params: unknown[]) => this.pool.query(sql, params).then((r) => r.rows);
    const [account] = await q(`SELECT role, created_at, last_login_at FROM users WHERE id = $1`, [user.id]);
    const reviews = await q(
      `SELECT r.id, o.name AS org_name, r.scores, r.avg, r.recommend, r.tags, r.text, r.verified, r.flagged, r.status, r.created_at
         FROM reviews r JOIN organizations o ON o.id = r.org_id WHERE r.author_ref = $1 ORDER BY r.created_at`,
      [ref],
    );
    const verifications = await q(
      `SELECT o.name AS org_name, v.method, v.created_at FROM verifications v JOIN organizations o ON o.id = v.org_id WHERE v.user_ref = $1`,
      [ref],
    );
    const messages = await q(`SELECT type, kinds, details, created_at, read_at FROM support_messages WHERE user_ref = $1 ORDER BY created_at`, [ref]);
    const reports = await q(
      `SELECT p.reason, p.details, p.status, p.decision_note, p.created_at, p.decided_at FROM reports p WHERE p.reporter_ref = $1 ORDER BY p.created_at`,
      [ref],
    );
    const orgs = await q(`SELECT name, city, status, created_at FROM organizations WHERE created_by = $1`, [ref]);
    const appeals = await q(`SELECT original_decision, text, status, decision_note, created_at, decided_at FROM appeals WHERE appellant_ref = $1 ORDER BY created_at`, [ref]);
    const saved = await q(`SELECT o.name AS org_name, s.created_at FROM saved_orgs s JOIN organizations o ON o.id = s.org_id WHERE s.user_ref = $1 ORDER BY s.created_at`, [ref]);
    const helpful = await q(
      `SELECT o.name AS org_name, h.created_at FROM review_helpful h JOIN reviews r ON r.id = h.review_id JOIN organizations o ON o.id = r.org_id WHERE h.voter_ref = $1 ORDER BY h.created_at`,
      [ref],
    );

    const interviews = await q(
      `SELECT o.name AS org_name, i.role, i.positive, i.offer, i.answered, i.difficulty, i.steps, i.text, i.status, i.created_at
         FROM interviews i JOIN organizations o ON o.id = i.org_id WHERE i.author_ref = $1 ORDER BY i.created_at`,
      [ref],
    );
    const salaries = await q(
      `SELECT o.name AS org_name, s.role, s.monthly_gross, s.paid_on_time, s.updated_at FROM salaries s JOIN organizations o ON o.id = s.org_id WHERE s.author_ref = $1 ORDER BY s.created_at`,
      [ref],
    );

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('content-disposition', `attachment; filename="peekjob-os-meus-dados-${date}.json"`);
    return {
      exportedAt: new Date().toISOString(),
      about:
        'Estes são todos os dados ligados à tua conta na PeekJob. Não guardamos o teu email: só um código derivado dele, que não permite recuperá-lo. ' +
        'These are all the data linked to your PeekJob account. We do not store your email, only a one-way code derived from it.',
      account: { role: account.role, createdAt: account.created_at, lastLoginAt: account.last_login_at },
      reviews: reviews.map((r) => ({
        id: r.id,
        orgName: r.org_name,
        scores: r.scores,
        average: Number(r.avg),
        recommend: r.recommend,
        tags: r.tags,
        text: r.text,
        verified: r.verified,
        flagged: r.flagged,
        status: r.status,
        createdAt: r.created_at,
      })),
      verifications: verifications.map((v) => ({ orgName: v.org_name, method: v.method, createdAt: v.created_at })),
      messages: messages.map((m) => ({ type: m.type, kinds: m.kinds, details: m.details, createdAt: m.created_at, readAt: m.read_at })),
      reportsFiled: reports.map((p) => ({ reason: p.reason, details: p.details, status: p.status, decision: p.decision_note, createdAt: p.created_at, decidedAt: p.decided_at })),
      organizationsAdded: orgs.map((o) => ({ name: o.name, city: o.city, status: o.status, createdAt: o.created_at })),
      appeals: appeals.map((a) => ({ decision: a.original_decision, text: a.text, status: a.status, answer: a.decision_note, createdAt: a.created_at, decidedAt: a.decided_at })),
      saved: saved.map((s) => ({ orgName: s.org_name, savedAt: s.created_at })),
      helpful: helpful.map((h) => ({ orgName: h.org_name, markedAt: h.created_at })),
      interviews: interviews.map((i) => ({
        orgName: i.org_name,
        role: i.role,
        positive: i.positive,
        offer: i.offer,
        answered: i.answered,
        difficulty: i.difficulty,
        steps: i.steps,
        text: i.text,
        status: i.status,
        createdAt: i.created_at,
      })),
      salaries: salaries.map((s) => ({ orgName: s.org_name, role: s.role, monthlyGross: s.monthly_gross, paidOnTime: s.paid_on_time, updatedAt: s.updated_at })),
    };
  }

  /**
   * Apagar a conta. Por omissão apaga também as avaliações; com keepReviews ficam publicadas,
   * mas o pseudónimo é substituído por um aleatório e deixam de estar ligadas à pessoa.
   */
  @Delete()
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const { keepReviews } = parse(DeleteBody, body ?? {});
    const ref = userRef(privacySecret(), user.id);
    await tx(this.pool, async (c) => {
      const u = await c.query(`SELECT email_hash FROM users WHERE id = $1`, [user.id]);
      if (keepReviews) await c.query(`UPDATE reviews SET author_ref = 'apagado:' || gen_random_uuid() WHERE author_ref = $1`, [ref]);
      else await c.query(`DELETE FROM reviews WHERE author_ref = $1`, [ref]);
      await c.query(`DELETE FROM interviews WHERE author_ref = $1`, [ref]);
      await c.query(`DELETE FROM salaries WHERE author_ref = $1`, [ref]);
      await c.query(`DELETE FROM support_messages WHERE user_ref = $1`, [ref]);
      await c.query(`DELETE FROM appeals WHERE appellant_ref = $1`, [ref]);
      await c.query(`DELETE FROM saved_orgs WHERE user_ref = $1`, [ref]);
      await c.query(`DELETE FROM review_helpful WHERE voter_ref = $1`, [ref]);
      await c.query(`DELETE FROM verifications WHERE user_ref = $1`, [ref]);
      await c.query(`DELETE FROM verification_codes WHERE user_ref = $1`, [ref]);
      await c.query(`UPDATE reports SET reporter_ref = NULL WHERE reporter_ref = $1`, [ref]);
      await c.query(`UPDATE organizations SET created_by = NULL WHERE created_by = $1`, [ref]);
      if (u.rows[0]) await c.query(`DELETE FROM login_tokens WHERE email_hash = $1`, [u.rows[0].email_hash]);
      await c.query(`DELETE FROM users WHERE id = $1`, [user.id]); // as sessões apagam-se em cascata
    });
    clearSessionCookie(res);
  }
}
