import { createHmac } from 'crypto';

/** Pseudónimo estável de uma pessoa (HMAC-SHA256). Nunca sai da API. */
export const userRef = (secret: string, userId: string) => createHmac('sha256', secret).update(`user:${userId}`).digest('hex');

export const privacySecret = () => {
  const s = process.env.PRIVACY_SECRET;
  if (!s && process.env.NODE_ENV === 'production') throw new Error('PRIVACY_SECRET em falta');
  return s ?? 'dev-only-secret';
};
