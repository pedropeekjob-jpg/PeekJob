import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Âncoras (#secção) vindas de outra página: faz scroll até à secção depois do scroll-to-top da mudança de ecrã.
 */
export function useHashScroll(delay = 60) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), delay);
    return () => window.clearTimeout(t);
  }, [hash, delay]);
}
