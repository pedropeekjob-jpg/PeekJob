import type { AppEnv } from '../common/config';

/** Cabeçalhos em todas as respostas */
export function baseHeaders(env: AppEnv): Record<string, string> {
  const h: Record<string, string> = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    'cross-origin-opener-policy': 'same-origin',
    // respostas da API (JSON) não carregam nada; o index substitui por htmlCsp()
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  };
  // HSTS só em produção: o domínio da UAT pode mudar e o HSTS fica guardado no browser um ano
  if (env === 'production') h['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
  return h;
}

const GA = ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'];

/**
 * CSP da web: só scripts do próprio site e do Google Analytics (carregado só com consentimento).
 * Sem scripts inline (a configuração vem de /pj-config.js). Estilos inline permitidos (atributos style do React).
 */
export function htmlCsp(env: AppEnv): string {
  const d = [
    "default-src 'self'",
    "script-src 'self' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${GA.join(' ')}`,
    `connect-src 'self' ${GA.join(' ')}`,
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  if (env === 'production') d.push('upgrade-insecure-requests');
  return d.join('; ');
}
