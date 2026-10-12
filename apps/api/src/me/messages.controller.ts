import { Controller, Get, HttpCode, Inject, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { EMERGENCY_NUMBER, SUPPORT_CONTACTS } from '@peekjob/shared';
import { Pool } from 'pg';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/dev-auth';
import { privacySecret, userRef } from '../common/privacy';
import { isUuid } from '../common/zod';
import { PG_POOL } from '../db/db.module';

/** Mensagens privadas de apoio: só a própria pessoa as vê. */
@Controller('me/messages')
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const { rows } = await this.pool.query(
      `SELECT m.id, m.kinds, m.created_at, m.read_at, o.name AS org_name
         FROM support_messages m
         LEFT JOIN reviews r ON r.id = m.review_id
         LEFT JOIN organizations o ON o.id = r.org_id
        WHERE m.user_ref = $1 ORDER BY m.created_at DESC`,
      [userRef(privacySecret(), user.id)],
    );
    return {
      items: rows.map((m) => ({
        id: m.id,
        kinds: m.kinds,
        orgName: m.org_name,
        createdAt: m.created_at,
        read: m.read_at != null,
        contacts: SUPPORT_CONTACTS,
        emergency: EMERGENCY_NUMBER,
      })),
    };
  }

  @Post(':id/read')
  @HttpCode(204)
  async read(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!isUuid(id)) throw new NotFoundException();
    const r = await this.pool.query(
      `UPDATE support_messages SET read_at = coalesce(read_at, now()) WHERE id = $1 AND user_ref = $2`,
      [id, userRef(privacySecret(), user.id)],
    );
    if (!r.rowCount) throw new NotFoundException();
  }
}
