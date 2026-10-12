import { createHash, createHmac, randomBytes } from 'crypto';
import { privacySecret } from '../common/privacy';

export const randomToken = () => randomBytes(32).toString('base64url');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const normalizeEmail = (e: string) => e.trim().toLowerCase();
/** HMAC do email: permite reencontrar a conta sem guardar o email */
export const emailHash = (email: string) => createHmac('sha256', privacySecret()).update(`email:${normalizeEmail(email)}`).digest('hex');
