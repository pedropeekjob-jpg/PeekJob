import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { REPORT_PERIODS, ReplyInput } from '@peekjob/shared';
import { memoryStorage } from 'multer';
import { z } from 'zod';
import { AuthGuard, CurrentUser, Roles, type AuthUser } from '../auth/auth.guard';
import { Lang } from '../common/lang';
import { memberRef, privacySecret } from '../common/privacy';
import { parse } from '../common/zod';
import { documentText, MAX_DOCUMENT_BYTES } from '../verification/document-text';
import { ClaimsService } from './claims.service';
import { DashboardService } from './dashboard.service';
import { PeriodicReportService } from './periodic-report.service';
import { RepliesService } from './replies.service';

const Claimant = { name: z.string().trim().min(2).max(120), role: z.string().trim().min(2).max(80) };
const EmailBody = z.object({ email: z.string().trim().toLowerCase().email(), lang: Lang });
const ConfirmBody = z.object({ code: z.string().regex(/^\d{6}$/), ...Claimant });
const DocBody = z.object(Claimant);
const DecisionBody = z.object({ action: z.enum(['approve', 'reject']), note: z.string().trim().min(10).max(1000) });
const ReportQuery = z.object({ periodo: z.enum(['semana', 'mes']).default('semana') });
const PlanBody = z.object({ plan: z.enum(['free', 'pro']) });

const ref = (user: AuthUser) => memberRef(privacySecret(), user.id);

/** Contas das organizações: reivindicar, responder, painel e plano */
@Controller()
@UseGuards(AuthGuard)
export class AccountsController {
  constructor(
    private readonly claims: ClaimsService,
    private readonly replies: RepliesService,
    private readonly dashboard: DashboardService,
    private readonly reports: PeriodicReportService,
  ) {}

  @Post('orgs/:id/claim/email')
  @HttpCode(202)
  async claimEmail(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const b = parse(EmailBody, body);
    await this.claims.sendCode(ref(user), id, b.email, b.lang);
    return { sent: true };
  }

  @Post('orgs/:id/claim/email/confirm')
  @HttpCode(201)
  claimConfirm(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const b = parse(ConfirmBody, body);
    return this.claims.confirmCode(ref(user), id, b.code, b);
  }

  /** Certidão, declaração ou ata com o NIF: lida em memória, nunca guardada */
  @Post('orgs/:id/claim/document')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 } }))
  async claimDocument(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const b = parse(DocBody, body);
    const text = await documentText(file, 'Envia o documento em PDF ou numa fotografia (JPG, PNG ou WebP).');
    return this.claims.byDocument(ref(user), id, text, b);
  }

  @Get('me/orgs')
  mine(@CurrentUser() user: AuthUser) {
    return this.claims.mine(ref(user));
  }

  @Get('orgs/:id/dashboard')
  dashboardFor(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.dashboard.get(id, ref(user));
  }

  /** Relatório semanal (?periodo=semana) ou mensal (?periodo=mes) — plano Pro */
  @Get('orgs/:id/report')
  report(@Param('id') id: string, @Query() query: unknown, @CurrentUser() user: AuthUser) {
    const { periodo } = parse(ReportQuery, query);
    return this.reports.get(id, ref(user), periodo === 'mes' ? 'month' : 'week');
  }

  @Put('reviews/:id/reply')
  reply(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.replies.upsert(id, ref(user), parse(ReplyInput, body).text);
  }

  @Delete('reviews/:id/reply')
  @HttpCode(204)
  async removeReply(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.replies.remove(id, ref(user));
  }

  @Get('moderation/claims')
  @Roles('moderator')
  queue() {
    return this.claims.queue();
  }

  @Post('moderation/claims/:id/decision')
  @HttpCode(200)
  @Roles('moderator')
  decide(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const b = parse(DecisionBody, body);
    return this.claims.decide(id, b.action, b.note, user.id);
  }

  @Get('moderation/managed')
  @Roles('moderator')
  managed() {
    return this.claims.managed();
  }

  @Put('moderation/orgs/:id/plan')
  @Roles('moderator')
  plan(@Param('id') id: string, @Body() body: unknown) {
    return this.claims.setPlan(id, parse(PlanBody, body).plan);
  }
}
