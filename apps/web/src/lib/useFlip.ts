import { useLayoutEffect, useRef } from 'react';

/**
 * Reordenação animada (FLIP): quando `order` muda, cada elemento desliza da posição antiga para a nova;
 * os que entram aparecem com um fade. Respeita "reduzir movimento". Devolve uma ref por id.
 */
export function useFlip(order: string) {
  const els = useRef(new Map<string, HTMLElement>());
  const prev = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    els.current.forEach((el, id) => {
      const before = prev.current.get(id);
      const now = el.getBoundingClientRect();
      if (before && !reduce) {
        const dx = before.left - now.left;
        const dy = before.top - now.top;
        if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
      } else if (!before && prev.current.size && !reduce) {
        el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
      }
    });
    const next = new Map<string, DOMRect>();
    els.current.forEach((el, id) => next.set(id, el.getBoundingClientRect()));
    prev.current = next;
  }, [order]);
  return (id: string) => (el: HTMLElement | null) => {
    if (el) els.current.set(id, el);
    else els.current.delete(id);
  };
}
