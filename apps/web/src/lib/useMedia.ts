import { useEffect, useState } from 'react';

export const DESKTOP_QUERY = '(min-width: 900px)';

export function useMedia(query: string) {
  const get = () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false);
  const [m, setM] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}

/** true a partir de 900px: mostra os layouts desktop */
export const useIsDesktop = () => useMedia(DESKTOP_QUERY);
