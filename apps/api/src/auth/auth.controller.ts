import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Lang } from '../common/lang';
import { parse } from '../common/zod';
import { AuthGuard, CurrentUser } from './auth.guard';
import { AuthService, type AuthUser } from './auth.service';
import { clearSessionCookie, readCookie, SESSION_COOKIE, setSessionCookie } from './session';

const LinkBody = z.object({ email: z.string().trim().toLowerCase().email().max(254), lang: Lang });
const VerifyBody = z.object({ token: z.string().min(20).max(200) });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Responde sempre igual, exista ou não a conta. */
  @Post('magic-link')
  @HttpCode(202)
  async magicLink(@Body() body: unknown) {
    const b = parse(LinkBody, body);
    await this.auth.requestLink(b.email, b.lang);
    return { sent: true };
  }

  @Post('verify')
  @HttpCode(200)
  async verify(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const { user, sessionId } = await this.auth.verify(parse(VerifyBody, body).token);
    setSessionCookie(res, sessionId);
    return { user };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(readCookie(req, SESSION_COOKIE));
    clearSessionCookie(res);
  }
}
