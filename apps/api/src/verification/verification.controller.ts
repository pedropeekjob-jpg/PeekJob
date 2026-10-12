import { Body, Controller, Get, HttpCode, Post, UnsupportedMediaTypeException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { z } from 'zod';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { privacySecret, userRef } from '../common/privacy';
import { parse } from '../common/zod';
import { pdfText } from './pdf-text';
import { VerificationService } from './verification.service';

const EmailBody = z.object({ orgId: z.string(), email: z.string().trim().toLowerCase().email() });
const ConfirmBody = z.object({ orgId: z.string(), code: z.string().regex(/^\d{6}$/) });
const DocBody = z.object({ orgId: z.string() });
const MAX_BYTES = 5 * 1024 * 1024;

@Controller()
@UseGuards(AuthGuard)
export class VerificationController {
  constructor(private readonly v: VerificationService) {}

  private ref(user: AuthUser) {
    return userRef(privacySecret(), user.id);
  }

  @Post('verifications/email')
  @HttpCode(202)
  async email(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const b = parse(EmailBody, body);
    await this.v.sendEmailCode(this.ref(user), b.orgId, b.email);
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
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } }))
  async document(@UploadedFile() file: Express.Multer.File | undefined, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const b = parse(DocBody, body);
    if (!file || file.mimetype !== 'application/pdf') throw new UnsupportedMediaTypeException('Envia o recibo ou contrato em PDF.');
    const text = await pdfText(file.buffer);
    file.buffer.fill(0);
    return this.v.verifyDocument(this.ref(user), b.orgId, text);
  }

  @Get('me/verifications')
  async mine(@CurrentUser() user: AuthUser) {
    return { orgIds: await this.v.listMine(this.ref(user)) };
  }
}
