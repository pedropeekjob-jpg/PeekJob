import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard, CurrentUser, Roles, type AuthUser } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { readCookie, SESSION_COOKIE } from '../auth/session';
import { Lang } from '../common/lang';
import { privacySecret, userRef } from '../common/privacy';
import { parse } from '../common/zod';
import type { ContentKind } from './content';
import { REPORT_REASONS, ReportsService } from './reports.service';

const ReportBody = z.object({
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).default(''),
  contactName: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().toLowerCase().email().max(254).optional(),
  lang: Lang,
});
const DecisionBody = z.object({
  action: z.enum(['remove', 'keep']),
  note: z.string().trim().min(10).max(1000),
});

@Controller()
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly auth: AuthService,
  ) {}

  /** Denunciar uma avaliação: com ou sem conta */
  @Post('reviews/:id/reports')
  @HttpCode(201)
  report(@Param('id') id: string, @Body() body: unknown, @Req() req: Request) {
    return this.create('review', id, body, req);
  }

  /** Denunciar uma entrevista: com ou sem conta */
  @Post('interviews/:id/reports')
  @HttpCode(201)
  reportInterview(@Param('id') id: string, @Body() body: unknown, @Req() req: Request) {
    return this.create('interview', id, body, req);
  }

  private async create(kind: ContentKind, id: string, body: unknown, req: Request) {
    const b = parse(ReportBody, body);
    const user = await this.auth.userForSession(readCookie(req, SESSION_COOKIE));
    const ref = user ? userRef(privacySecret(), user.id) : null;
    const r = await this.reports.create(kind, id, b, ref, req.ip ?? 'desconhecido');
    return { reference: r.reference };
  }

  @Get('moderation/reports')
  @UseGuards(AuthGuard)
  @Roles('moderator')
  queue() {
    return this.reports.queue();
  }

  @Post('moderation/reviews/:id/decision')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Roles('moderator')
  decide(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const b = parse(DecisionBody, body);
    return this.reports.decide('review', id, b.action, b.note, user.id);
  }

  @Post('moderation/interviews/:id/decision')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Roles('moderator')
  decideInterview(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const b = parse(DecisionBody, body);
    return this.reports.decide('interview', id, b.action, b.note, user.id);
  }
}
