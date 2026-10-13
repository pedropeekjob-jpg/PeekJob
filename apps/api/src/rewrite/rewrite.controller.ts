import { Body, Controller, HttpCode, HttpException, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { REVIEW_TEXT_MAX } from '@peekjob/shared';
import { createHmac } from 'crypto';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service';
import { readCookie, SESSION_COOKIE } from '../auth/session';
import { Lang } from '../common/lang';
import { privacySecret } from '../common/privacy';
import { parse } from '../common/zod';
import { RateLimiter, type RateRule } from '../security/rate-limit';
import { REWRITER, type Rewriter } from './rewriter';

const RewriteBody = z.object({ text: z.string().trim().min(1).max(REVIEW_TEXT_MAX), lang: Lang });

/** 20 propostas por 10 minutos, por pessoa (com sessão) ou por IP pseudonimizado */
export const REWRITE_RULE: RateRule = { name: 'rewrite', max: 20, windowMs: 10 * 60 * 1000 };

@Controller('reviews')
export class RewriteController {
  constructor(
    @Inject(REWRITER) private readonly rewriter: Rewriter,
    private readonly limiter: RateLimiter,
    private readonly auth: AuthService,
  ) {}

  /** Propõe uma versão publicável do comentário. Não guarda o texto. */
  @Post('rewrite')
  @HttpCode(200)
  async rewrite(@Body() body: unknown, @Req() req: Request) {
    const b = parse(RewriteBody, body);
    const user = await this.auth.userForSession(readCookie(req, SESSION_COOKIE));
    const who = user ? `user:${user.id}` : `ip:${req.ip ?? 'desconhecido'}`;
    const key = createHmac('sha256', privacySecret()).update(`rewrite:${who}`).digest('hex');
    if (!this.limiter.take(REWRITE_RULE, key).ok) throw new HttpException('Demasiados pedidos. Tenta daqui a uns minutos.', HttpStatus.TOO_MANY_REQUESTS);
    const r = await this.rewriter.rewrite(b.text, b.lang);
    return { text: r.text, source: r.source, changed: r.text !== b.text };
  }
}
