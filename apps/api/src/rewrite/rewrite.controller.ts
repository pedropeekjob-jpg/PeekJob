import { HttpCode, HttpException, HttpStatus, Injectable, Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { REVIEW_TEXT_MAX } from '@peekjob/shared';
import { createHmac } from 'crypto';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service';
import { readCookie, SESSION_COOKIE } from '../auth/session';
import { Lang } from '../common/lang';
import { privacySecret } from '../common/privacy';
import { parse } from '../common/zod';
import { REWRITER, type Rewriter } from './rewriter';

const RewriteBody = z.object({ text: z.string().trim().min(1).max(REVIEW_TEXT_MAX), lang: Lang });

/** Limite simples em memória (uma instância): N pedidos por janela, por pessoa ou por IP pseudonimizado. */
@Injectable()
export class RewriteLimiter {
  static readonly MAX = 20;
  static readonly WINDOW_MS = 10 * 60 * 1000;
  private hits = new Map<string, number[]>();

  take(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < RewriteLimiter.WINDOW_MS);
    if (recent.length >= RewriteLimiter.MAX) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10000) this.hits.clear(); // proteção de memória
    return true;
  }
  clear() {
    this.hits.clear();
  }
}

@Controller('reviews')
export class RewriteController {
  constructor(
    @Inject(REWRITER) private readonly rewriter: Rewriter,
    private readonly limiter: RewriteLimiter,
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
    if (!this.limiter.take(key)) throw new HttpException('Demasiados pedidos. Tenta daqui a uns minutos.', HttpStatus.TOO_MANY_REQUESTS);
    const r = await this.rewriter.rewrite(b.text, b.lang);
    return { text: r.text, source: r.source, changed: r.text !== b.text };
  }
}
