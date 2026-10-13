type Env = Record<string, string | undefined>;

/**
 * Endereço público da web (usado nos links dos emails).
 * WEB_ORIGIN pode ter vários valores separados por vírgulas (CORS); o primeiro é o principal.
 * No Render, sem WEB_ORIGIN, usa o endereço público do próprio serviço (web e API na mesma origem).
 */
export function webOrigin(env: Env = process.env): string {
  const first = env.WEB_ORIGIN?.split(',')[0]?.trim() || env.RENDER_EXTERNAL_URL || 'http://localhost:5173';
  return first.replace(/\/$/, '');
}

/** Origens aceites pelo CORS (só interessa quando a web está noutro domínio, ex.: Vite em desenvolvimento) */
export function corsOrigins(env: Env = process.env): string[] {
  return (env.WEB_ORIGIN ?? webOrigin(env)).split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
}

export type AppEnv = 'production' | 'uat' | 'development';

/** Ambiente: production, uat (testes com o cliente) ou development (local) */
export function appEnv(env: Env = process.env): AppEnv {
  const v = env.APP_ENV?.trim().toLowerCase();
  return v === 'production' || v === 'uat' ? v : 'development';
}

/** Assunto dos emails: na UAT leva [UAT] para não se confundir com produção */
export const mailSubject = (subject: string, env: Env = process.env) => (appEnv(env) === 'uat' ? `[UAT] ${subject}` : subject);
