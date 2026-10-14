import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { isTypingKey, ZONE_PARAM, zoneFromParam, zoneParam, type Zone } from './home';

/** Estado de navegação: abrir a partir das duas zonas permite fechar com "voltar" (sem entradas a mais no histórico) */
type NavState = { fromSplit?: boolean } | null;

/**
 * Zona aberta da página inicial. Abrir põe ?lado= no endereço; fechar volta às duas zonas
 * (Escape também fecha). Nas duas zonas, começar a escrever abre a pesquisa com o que se escreveu.
 */
export function useHomeZone() {
  const [params, setParams] = useSearchParams();
  const zone = zoneFromParam(params.get(ZONE_PARAM));
  const nav = useNavigate();
  const fromSplit = !!(useLocation().state as NavState)?.fromSplit;
  // texto já escrito antes de a pesquisa abrir
  const [typed, setTyped] = useState('');
  // zona que acabou de fechar: o foco volta ao botão dela
  const [closed, setClosed] = useState<Zone | null>(null);

  const open = useCallback(
    (z: Zone) => {
      setParams({ [ZONE_PARAM]: zoneParam(z) }, { state: { fromSplit: true } });
    },
    [setParams],
  );

  const close = useCallback(() => {
    setClosed(zone);
    setTyped('');
    if (fromSplit) nav(-1);
    else setParams({}, { replace: true });
  }, [zone, fromSplit, nav, setParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zone) close();
      else if (!zone && isTypingKey(e) && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setTyped(e.key);
        open('peek');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zone, open, close]);

  return { zone, open, close, typed, closed };
}
