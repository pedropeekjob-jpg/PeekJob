import { describe, expect, it } from 'vitest';
import type { Org } from '../../src/data/orgs';
import { bumpHelpful, helpfulShown, loadEngagement, syncOnLogin, type Call } from '../../src/lib/engagement';

/** API a fingir: guarda os pedidos e responde por caminho (sem vi.fn assíncronos que rejeitam) */
function fakeApi(server: { saved: string[]; helpful: string[]; refuse?: string[] }) {
  const calls: string[] = [];
  const call: Call = async <T,>(path: string, opts: { method?: string; body?: unknown } = {}) => {
    const method = opts.method ?? (opts.body ? 'POST' : 'GET');
    calls.push(`${method} ${path}`);
    if (path === '/me/saved/merge') {
      const ids = (opts.body as { ids: string[] }).ids;
      server.saved = [...new Set([...ids, ...server.saved])];
      return { items: server.saved } as T;
    }
    if (path === '/me/saved') return { items: server.saved } as T;
    if (path === '/me/helpful') return { items: server.helpful } as T;
    const m = /^\/reviews\/(.+)\/helpful$/.exec(path);
    if (m && method === 'PUT') {
      if (server.refuse?.includes(m[1])) throw new Error('403');
      server.helpful = [...new Set([...server.helpful, m[1]])];
      return undefined as T;
    }
    throw new Error(`inesperado: ${method} ${path}`);
  };
  return { call, calls, server };
}

describe('guardadas e útil na conta', () => {
  it('ao entrar junta o que estava no browser ao que está na conta', async () => {
    const f = fakeApi({ saved: ['a'], helpful: ['r1'], refuse: ['minha'] });
    const r = await syncOnLogin(f.call, { saved: ['b'], useful: { r2: true, r3: false, minha: true } });
    expect(r.saved.sort()).toEqual(['a', 'b']);
    // o útil da própria avaliação é recusado e não conta; o r3 estava desligado
    expect(r.pushed).toEqual(['r2']);
    expect(r.useful).toEqual({ r1: true, r2: true });
    expect(f.calls).not.toContain('PUT /reviews/r3/helpful');
  });

  it('sem nada no browser: só lê da conta', async () => {
    const f = fakeApi({ saved: ['a'], helpful: [] });
    expect(await syncOnLogin(f.call, { saved: [], useful: {} })).toEqual({ saved: ['a'], useful: {}, pushed: [] });
    expect(f.calls).toEqual(['GET /me/saved', 'GET /me/helpful']);
  });

  it('ao abrir a app com sessão: a conta manda (não volta a juntar o browser)', async () => {
    const f = fakeApi({ saved: ['a'], helpful: ['r1'] });
    expect(await loadEngagement(f.call)).toEqual({ saved: ['a'], useful: { r1: true } });
    expect(f.calls).toEqual(['GET /me/saved', 'GET /me/helpful']);
  });

  it('contagem mostrada: com conta já vem do servidor; sem conta soma o meu', () => {
    expect(helpfulShown(4, true, true)).toBe(4);
    expect(helpfulShown(4, true, false)).toBe(5);
    expect(helpfulShown(4, false, false)).toBe(4);
  });

  it('ajusta a contagem da avaliação nas organizações carregadas (sem mexer nas outras)', () => {
    const org = (id: string, reviews: { id: string; useful: number }[]) => ({ id, reviews }) as unknown as Org;
    const details = { o1: org('o1', [{ id: 'r1', useful: 2 }, { id: 'r2', useful: 0 }]), o2: org('o2', [{ id: 'r9', useful: 1 }]) };
    const next = bumpHelpful(details, 'r1', 1);
    expect(next.o1.reviews.map((r) => r.useful)).toEqual([3, 0]);
    expect(next.o2).toBe(details.o2);
    expect(bumpHelpful(next, 'r2', -1).o1.reviews[1].useful).toBe(0); // nunca abaixo de zero
  });
});
