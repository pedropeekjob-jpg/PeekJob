import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/** Voltar ao ecrã anterior; sem histórico (ex.: link aberto diretamente), ir para `fallback` */
export function useBack(fallback: string) {
  const nav = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) nav(-1);
    else nav(fallback);
  }, [nav, fallback]);
}
