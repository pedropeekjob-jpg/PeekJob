import { Body, Controller, Get, HttpCode, type OnApplicationShutdown, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { z } from 'zod';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { privacySecret, userRef } from '../common/privacy';
import { parse } from '../common/zod';
import { documentText, MAX_DOCUMENT_BYTES } from './document-text';
import { stopOcr } from './image-text';
import { VerificationService } from './verification.service';
import { Lang } from '../common/lang';

const EmailBody = z.object({ orgId: z.string(), email: z.string().trim().toLowerCase().email(), lang: Lang });
const ConfirmBody = z.object({ orgId: z.string(), code: z.string().regex(/^\d{6}$/) });
const DocBody = z.object({ orgId: z.string() });

@Controller()
@UseGuards(AuthGuard)
export class VerificationController implements OnApplicationShutdown {
  constructor(private readonly v: VerificationService) {}

  /** Ao fechar a app, desliga o OCR (se estiver ligado) */
  onApplicationShutdown() {
    return stopOcr();
  }

  private ref(user: AuthUser) {
    return userRef(privacySecret(), user.id);
  }

  @Post('verifications/email')
  @HttpCode(202)
  async email(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const b = parse(EmailBody, body);
    await this.v.sendEmailCode(this.ref(user), b.orgId, b.email, b.lang);
    return { sent: true };
  }

  @Post('verifications/email/confirm')
  @HttpCode(200)
  confirm(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const b = parse(ConfirmBody, body);
    return this.v.confirmEmailCode(this.ref(user), b.orgId, b.code);
  }

  /** O ficheiro fica só em memória durante o pedido (memoryStorage) e é descartado no fim. */
  @Post('verifications/document')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 } }))
  async document(@UploadedFile() file: Express.Multer.File | undefined, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const b = parse(DocBody, body);
    const text = await documentText(file, 'Envia o recibo ou contrato em PDF ou numa fotografia (JPG, PNG ou WebP).');
    return this.v.verifyDocument(this.ref(user), b.orgId, text);
  }

  @Get('me/verifications')
  async mine(@CurrentUser() user: AuthUser) {
    return { orgIds: await this.v.listMine(this.ref(user)) };
  }
}
