type Env = Record<string, string | undefined>;

export type ViesResult = { status: 'valid'; name: string | null; address: string | null } | { status: 'invalid' } | { status: 'unavailable' };
export interface ViesClient {
  check(nif: string): Promise<ViesResult>;
}
export const VIES = 'VIES';

const clean = (v: unknown) => {
  if (typeof v !== 'string') return null;
  const s = v.split('\n').map((l) => l.trim()).filter(Boolean).join(', ');
  return !s || /^-+$/.test(s) ? null : s;
};

/**
 * VIES (Comissão Europeia): confirma NIFs com registo de IVA e devolve o nome e a morada oficiais.
 * Gratuito, sem chave. Atenção: "invalid" só quer dizer "sem IVA intracomunitário" (muitas associações).
 */
export class HttpVies implements ViesClient {
  constructor(
    private readonly fetchFn: typeof fetch = fetch,
    private readonly baseUrl = 'https://ec.europa.eu/taxation_customs/vies/rest-api',
    private readonly timeoutMs = 5000,
  ) {}

  async check(nif: string): Promise<ViesResult> {
    try {
      const res = await Promise.race([
        this.fetchFn(`${this.baseUrl}/ms/PT/vat/${nif}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(this.timeoutMs) }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), this.timeoutMs).unref?.()),
      ]);
      if (!res.ok) return { status: 'unavailable' };
      const b = (await res.json()) as { isValid?: boolean; name?: string; address?: string; userError?: string };
      if (b.isValid) return { status: 'valid', name: clean(b.name), address: clean(b.address) };
      if (b.userError && b.userError !== 'INVALID' && b.userError !== 'VALID') return { status: 'unavailable' };
      return { status: 'invalid' };
    } catch {
      return { status: 'unavailable' };
    }
  }
}

/** Sem rede (testes) ou desligado com VIES_URL=off */
export class OfflineVies implements ViesClient {
  async check(): Promise<ViesResult> {
    return { status: 'unavailable' };
  }
}

export function createVies(env: Env = process.env): ViesClient {
  if (env.VIES_URL === 'off' || (env.NODE_ENV === 'test' && !env.VIES_URL)) return new OfflineVies();
  return new HttpVies(fetch, env.VIES_URL || undefined);
}
