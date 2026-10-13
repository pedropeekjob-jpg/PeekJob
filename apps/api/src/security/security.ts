import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { appEnv, corsOrigins } from '../common/config';
import { baseHeaders } from './headers';
import { GLOBAL_RULE, RateLimiter, ruleFor } from './rate-limit';

export const MAX_JSON_BODY = '64kb';
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Cabeçalhos, Origin, limites por IP e tamanho dos pedidos. Chamado antes das rotas. */
export function applySecurity(app: INestApplication) {
  const env = appEnv();
  const headers = baseHeaders(env);
  const express = app.getHttpAdapter().getInstance() as { disable: (k: string) => void };
  express.disable('x-powered-by');
  // body parser com limite explícito (o Nest não volta a registar os seus)
  const withParser = app as unknown as { useBodyParser?: (type: string, opts: { limit: string }) => void };
  withParser.useBodyParser?.('json', { limit: MAX_JSON_BODY });
  withParser.useBodyParser?.('urlencoded', { limit: MAX_JSON_BODY });

  const limiter = app.get(RateLimiter);
  const allowed = new Set(corsOrigins());

  app.use((req: Request, res: Response, next: NextFunction) => {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);

    // Pedidos que mudam dados vindos de outro site: recusados (defesa extra além do SameSite do cookie)
    const origin = req.headers.origin;
    if (origin && UNSAFE.has(req.method) && !allowed.has(origin) && origin !== `${req.protocol}://${req.get('host')}`) {
      return res.status(403).json({ statusCode: 403, message: 'Pedido de outro site recusado.' });
    }

    const rule = ruleFor(req.method, req.path);
    if (rule) {
      const ip = req.ip ?? 'desconhecido';
      for (const r of rule === GLOBAL_RULE ? [rule] : [rule, GLOBAL_RULE]) {
        const t = limiter.take(r, ip);
        if (!t.ok) {
          res.setHeader('retry-after', String(t.retryAfterSec));
          return res.status(429).json({ statusCode: 429, message: 'Demasiados pedidos. Tenta daqui a uns minutos.' });
        }
      }
    }
    next();
  });
}
