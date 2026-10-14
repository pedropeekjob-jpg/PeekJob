import { describe, expect, it, vi } from 'vitest';
import { lazyPage, loadOrReload } from '../src/lib/lazyPage';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
};

describe('carregar páginas a pedido', () => {
  it('carregou: devolve o módulo e limpa a marca de recarga', async () => {
    const s = memory();
    s.setItem('pj-chunk-reload', '1');
    await expect(loadOrReload(async () => 'ok', s)).resolves.toBe('ok');
    expect(s.m.size).toBe(0);
  });

  it('falhou (publicação nova): recarrega uma vez; se voltar a falhar, passa o erro', async () => {
    const s = memory();
    const reload = vi.fn();
    const fail = () => Promise.reject(new Error('chunk'));
    void loadOrReload(fail, s, reload); // fica à espera da recarga
    await Promise.resolve();
    await Promise.resolve();
    expect(reload).toHaveBeenCalledTimes(1);
    await expect(loadOrReload(fail, s, reload)).rejects.toThrow('chunk');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('preload descarrega só uma vez', async () => {
    const load = vi.fn(async () => ({ default: () => null }));
    const Page = lazyPage(load);
    await Page.preload();
    await Page.preload();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
