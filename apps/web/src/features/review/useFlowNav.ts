import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { setPendingReturn } from './flowReturn';

/** Guardado no estado de cada entrada do histórico dentro do fluxo de avaliar */
export interface FlowState {
  /** Quantas entradas do histórico o fluxo já ocupa (incluindo a atual) */
  flowDepth: number;
  /** Havia um ecrã antes de o fluxo começar (não foi aberto diretamente por um link) */
  flowHasPrev: boolean;
  /** O passo anterior dentro do fluxo (caminho), quando se avançou sem substituir */
  flowFrom?: string;
}

/** Posição no histórico do browser (o React Router guarda-a); no router em memória dos testes não existe */
const historyIdx = () => (typeof window === 'undefined' ? undefined : (window.history.state as { idx?: number } | null)?.idx);

/**
 * Estado do fluxo nesta entrada; na primeira entrada do fluxo ainda não há, e começa-se aqui.
 * Sem nada antes: a primeira entrada do router (chave "default") ou a posição 0 do histórico
 * (ex.: um separador aberto pelo link do email, em que /entrar foi substituído pelas notas).
 */
export function flowStateOf(state: unknown, key: string, idx: number | undefined = historyIdx()): FlowState {
  const s = state as Partial<FlowState> | null;
  if (s && typeof s.flowDepth === 'number') return { flowDepth: s.flowDepth, flowHasPrev: !!s.flowHasPrev, flowFrom: s.flowFrom };
  return { flowDepth: 1, flowHasPrev: key !== 'default' && (idx === undefined || idx > 0) };
}

const pathOf = (to: string) => to.split(/[?#]/)[0];

/**
 * Navegação dentro do fluxo de avaliar (escolher → notas → publicado → verificar).
 * Cada entrada sabe quantas o fluxo ocupa; sair anda para trás esse número, por isso o "voltar" do browser
 * depois de sair leva onde se estava antes de avaliar (ex.: lista → organização), e nunca de volta ao fluxo.
 * - `go`: avança (ou substitui) dentro do fluxo
 * - `linkState`: o mesmo, para um <Link> (abrir num separador continua a funcionar)
 * - `leave(fallback)`: sai para onde se estava; aberto diretamente, vai para `fallback` (substitui)
 * - `leaveTo(destino)`: sai e abre o destino (se não for onde se volta); sem nada antes, substitui
 * - `back(fallback)`: um passo atrás dentro do fluxo; no primeiro passo é como `leave`
 * - `change()`: voltar à escolha da organização (se veio de lá, recua; senão substitui)
 */
export function useFlowNav() {
  const nav = useNavigate();
  const { state, key, pathname, search } = useLocation();
  const { flowDepth, flowHasPrev, flowFrom } = flowStateOf(state, key);
  const here = pathname + search;

  const linkState = useMemo((): FlowState => ({ flowDepth: flowDepth + 1, flowHasPrev, flowFrom: here }), [flowDepth, flowHasPrev, here]);

  const go = useCallback(
    (to: string, { replace = false }: { replace?: boolean } = {}) =>
      nav(to, { replace, state: (replace ? { flowDepth, flowHasPrev, flowFrom } : linkState) satisfies FlowState }),
    [nav, flowDepth, flowHasPrev, flowFrom, linkState],
  );

  const leave = useCallback(
    (fallback: string) => {
      if (flowHasPrev) nav(-flowDepth);
      else nav(fallback, { replace: true });
    },
    [nav, flowDepth, flowHasPrev],
  );

  const leaveTo = useCallback(
    (target: string) => {
      if (!flowHasPrev) return nav(target, { replace: true });
      setPendingReturn(target);
      nav(-flowDepth);
    },
    [nav, flowDepth, flowHasPrev],
  );

  const back = useCallback((fallback: string) => (flowDepth > 1 ? nav(-1) : leave(fallback)), [nav, flowDepth, leave]);

  const change = useCallback(() => {
    if (flowDepth > 1 && flowFrom && pathOf(flowFrom) === '/avaliar') nav(-1);
    else go('/avaliar', { replace: true });
  }, [nav, go, flowDepth, flowFrom]);

  return { go, leave, leaveTo, back, change, linkState };
}
