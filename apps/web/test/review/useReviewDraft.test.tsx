import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useReviewDraft } from '../../src/features/review/useReviewDraft';
import { Providers, WithDraft } from '../utils/render';

const wrapper = ({ children }: { children: ReactNode }) => (
  <Providers>
    <WithDraft patch={{ scores: {} }}>{children}</WithDraft>
  </Providers>
);

describe('useReviewDraft: estado e ações do texto da avaliação', () => {
  beforeEach(() => localStorage.clear());

  it('sem notas não se pode publicar; com uma nota e texto limpo sim', () => {
    const { result } = renderHook(() => useReviewDraft(), { wrapper });
    expect(result.current.canPublish).toBe(false);
    act(() => result.current.setScore('ambiente', 4));
    act(() => result.current.setText('Equipa unida e horários cumpridos.'));
    expect(result.current).toMatchObject({ done: 1, insult: false, canPublish: true });
  });

  it('nomes ou insultos bloqueiam; possíveis ilegalidades são assinaladas mas não bloqueiam', () => {
    const { result } = renderHook(() => useReviewDraft(), { wrapper });
    act(() => result.current.setScore('ambiente', 2));
    act(() => result.current.setText('O Ricardo é um idiota.'));
    expect(result.current).toMatchObject({ insult: true, canPublish: false });
    act(() => result.current.setText('O salário chega sempre atrasado.'));
    expect(result.current.redFlags.flagged).toBe(true);
    expect(result.current.canPublish).toBe(true);
  });

  it('o texto é cortado aos 600 caracteres', () => {
    const { result } = renderHook(() => useReviewDraft(), { wrapper });
    act(() => result.current.setText('a'.repeat(700)));
    expect(result.current.text).toHaveLength(600);
  });

  it('etiquetas: escolher e tirar', () => {
    const { result } = renderHook(() => useReviewDraft(), { wrapper });
    act(() => result.current.toggleTag('Horários cumpridos'));
    expect(result.current.tags).toEqual(['Horários cumpridos']);
    act(() => result.current.toggleTag('Horários cumpridos'));
    expect(result.current.tags).toEqual([]);
  });

  it('notas: escolher e tirar (0 tira a nota)', () => {
    const { result } = renderHook(() => useReviewDraft(), { wrapper });
    act(() => result.current.setScore('salario', 3));
    expect(result.current.scores).toEqual({ salario: 3 });
    act(() => result.current.setScore('salario', 0));
    expect(result.current.scores).toEqual({});
  });

  it('publicar: devolve ok e limpa o rascunho (demonstração)', async () => {
    const { result } = renderHook(() => useReviewDraft(), { wrapper: ({ children }) => <Providers><WithDraft patch={{ scores: { ambiente: 4 }, text: 'Boa equipa.' }}>{children}</WithDraft></Providers> });
    let ok = false;
    await act(async () => {
      ok = await result.current.publish();
    });
    expect(ok).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('não publica quando não pode (sem notas)', async () => {
    const { result } = renderHook(() => useReviewDraft(), { wrapper });
    let ok = true;
    await act(async () => {
      ok = await result.current.publish();
    });
    expect(ok).toBe(false);
  });
});

describe('useReviewDraft: recomendar', () => {
  it('sim, não e sem resposta', () => {
    const { result } = renderHook(() => useReviewDraft(), { wrapper });
    act(() => result.current.setRecommend(true));
    expect(result.current.recommend).toBe(true);
    act(() => result.current.setRecommend(null));
    expect(result.current.recommend).toBeNull();
  });
});
