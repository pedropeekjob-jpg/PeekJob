import type { INestApplication } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { appEnv } from '../common/config';

const digest = (s: string) => createHash('sha256').update(s).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/**
 * UAT (APP_ENV=uat): tudo atrás de uma palavra-passe (HTTP Basic), exceto o health check do alojamento,
 * e fora dos motores de pesquisa. Sem BASIC_AUTH_USER/BASIC_AUTH_PASSWORD a UAT recusa arrancar.
 */
export function protectEnvironment(app: INestApplication) {
  // O ambiente e a palavra-passe ficam fixos no arranque
  if (appEnv() !== 'uat') return;
  const user = process.env.BASIC_AUTH_USER ?? '';
  const pass = process.env.BASIC_AUTH_PASSWORD ?? '';
  if (!user || !pass) throw new Error('BASIC_AUTH_USER e BASIC_AUTH_PASSWORD são obrigatórios em UAT (APP_ENV=uat)');
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('x-robots-tag', 'noindex, nofollow');
    if (req.path === '/health' || req.method === 'OPTIONS') return next();
    const header = req.headers.authorization ?? '';
    if (header.startsWith('Basic ')) {
      const [u, ...rest] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':');
      if (same(u, user) && same(rest.join(':'), pass)) return next();
    }
    res.setHeader('www-authenticate', 'Basic realm="PeekJob UAT", charset="UTF-8"');
    res.status(401).type('text/plain').send('PeekJob UAT: acesso reservado / restricted access');
  });
}
