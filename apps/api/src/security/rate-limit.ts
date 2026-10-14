import { Injectable } from '@nestjs/common';

export interface RateRule {
  name: string;
  max: number;
  windowMs: number;
}
type Take = { ok: true } | { ok: false; retryAfterSec: number };

const MIN = 60_000;
/** Limites por IP. A ordem conta: a primeira regra que corresponde é a usada (e a global vale sempre). */
const RULES: { method: string; path: RegExp; rule: RateRule }[] = [
  // vários emails a partir do mesmo IP (bombardear caixas de correio de outras pessoas)
  { method: 'POST', path: /^\/auth\/magic-link$/, rule: { name: 'magic-link', max: 10, windowMs: 60 * MIN } },
  // adivinhar tokens
  { method: 'POST', path: /^\/auth\/verify$/, rule: { name: 'verify', max: 30, windowMs: 15 * MIN } },
  { method: 'POST', path: /^\/verifications\/email(\/confirm)?$/, rule: { name: 'work-email', max: 20, windowMs: 60 * MIN } },
  // reivindicar uma página: códigos por email (e adivinhá-los)
  { method: 'POST', path: /^\/orgs\/[^/]+\/claim\/email(\/confirm)?$/, rule: { name: 'claim-email', max: 20, windowMs: 60 * MIN } },
  { method: 'GET', path: /^\/orgs\/nif\//, rule: { name: 'nif-lookup', max: 30, windowMs: 10 * MIN } },
  { method: 'POST', path: /^\/client-errors$/, rule: { name: 'client-errors', max: 20, windowMs: 10 * MIN } },
  // recolha automática do catálogo
  { method: 'GET', path: /^\/orgs\/search$/, rule: { name: 'search', max: 120, windowMs: MIN } },
];
export const GLOBAL_RULE: RateRule = { name: 'global', max: 600, windowMs: MIN };

/** Regra para um pedido; null = sem limite (health check, ficheiros da web, configuração). */
export function ruleFor(method: string, path: string): RateRule | null {
  if (path === '/health' || path === '/pj-config.js' || path.startsWith('/assets/') || /\.[a-z0-9]{2,5}$/i.test(path)) return null;
  return RULES.find((r) => r.method === method && r.path.test(path))?.rule ?? GLOBAL_RULE;
}

/**
 * Janela deslizante em memória. Chega para uma instância (Render); com várias instâncias passar para Redis/PostgreSQL.
 * Guarda só o IP e as horas dos pedidos, em memória, nunca em disco.
 */
/**
 * Multiplicador dos limites, só para os testes automáticos no browser (todos os pedidos vêm do mesmo IP).
 * Em produção recusa arrancar se estiver definido.
 */
export function rateLimitScale(env: Record<string, string | undefined> = process.env): number {
  const raw = env.RATE_LIMIT_SCALE;
  if (!raw) return 1;
  if (env.APP_ENV === 'production') throw new Error('RATE_LIMIT_SCALE não pode ser usado em produção');
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) throw new Error('RATE_LIMIT_SCALE tem de ser um número ≥ 1');
  return n;
}

@Injectable()
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private readonly scale: number = 1) {}

  take(rule: RateRule, key: string, now = Date.now()): Take {
    const k = `${rule.name}:${key}`;
    const recent = (this.hits.get(k) ?? []).filter((t) => now - t < rule.windowMs);
    if (recent.length >= rule.max * this.scale) {
      this.hits.set(k, recent);
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + rule.windowMs - now) / 1000)) };
    }
    recent.push(now);
    this.hits.set(k, recent);
    if (this.hits.size > 50_000) this.prune(now);
    return { ok: true };
  }

  clear() {
    this.hits.clear();
  }

  private prune(now: number) {
    for (const [k, v] of this.hits) if (!v.length || now - v[v.length - 1] > 60 * MIN) this.hits.delete(k);
    if (this.hits.size > 50_000) this.hits.clear();
  }
}
