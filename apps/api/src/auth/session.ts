import type { Request, Response } from 'express';
import { SESSION_DAYS } from './auth.service';

export const SESSION_COOKIE = 'pj_session';

export function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

/** Cookie httpOnly (inacessível a JavaScript), SameSite=Lax, Secure em produção */
export function setSessionCookie(res: Response, sessionId: string) {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'none' | undefined) ?? 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DAYS * 24 * 3600 * 1000,
    path: '/',
  });
}

export const clearSessionCookie = (res: Response) => res.clearCookie(SESSION_COOKIE, { path: '/' });
