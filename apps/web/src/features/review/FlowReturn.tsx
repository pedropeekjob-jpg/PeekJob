import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { takePendingReturn } from './flowReturn';

/**
 * Sair do fluxo para um destino é feito em dois passos: recuar até antes do fluxo e, quando lá chegar,
 * abrir o destino (se não for esse mesmo ecrã). Recuar no histórico é assíncrono: por isso este componente,
 * montado ao lado das rotas, espera pela mudança de endereço.
 */
export function FlowReturn() {
  const { key, pathname } = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    const to = takePendingReturn();
    if (to && pathname !== to.split(/[?#]/)[0]) nav(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando o endereço muda
  }, [key]);
  return null;
}
