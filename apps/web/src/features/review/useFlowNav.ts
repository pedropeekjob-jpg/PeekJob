import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** Guardado no estado de cada entrada do histórico dentro do fluxo de avaliar */
interface FlowState {
  /** Quantas entradas do histórico o fluxo já ocupa (incluindo a atual) */
  flowDepth: number;
  /** Havia um ecrã antes de o fluxo começar (não foi aberto diretamente por um link) */
  flowHasPrev: boolean;
}

/** Estado do fluxo nesta entrada; na primeira entrada do fluxo ainda não há, e começa-se aqui */
export function flowStateOf(state: unknown, key: string): FlowState {
  const s = state as Partial<FlowState> | null;
  if (s && typeof s.flowDepth === 'number') return { flowDepth: s.flowDepth, flowHasPrev: !!s.flowHasPrev };
  // a primeira entrada do router tem a chave "default": abriu-se o fluxo diretamente, sem ecrã antes
  return { flowDepth: 1, flowHasPrev: key !== 'default' };
}

/**
 * Navegação dentro do fluxo de avaliar (escolher → notas → publicado).
 * `go` regista quantas entradas o fluxo ocupa; `leave` sai do fluxo andando para trás esse número de entradas,
 * por isso o "voltar" do browser depois de sair leva onde se estava antes (ex.: lista → organização), e não
 * de volta ao fluxo. Aberto diretamente (sem ecrã antes), `leave` vai para `fallback` substituindo a entrada atual.
 */
export function useFlowNav() {
  const nav = useNavigate();
  const { state, key } = useLocation();
  const { flowDepth, flowHasPrev } = flowStateOf(state, key);

  const go = useCallback(
    (to: string, { replace = false }: { replace?: boolean } = {}) =>
      nav(to, { replace, state: { flowDepth: replace ? flowDepth : flowDepth + 1, flowHasPrev } satisfies FlowState }),
    [nav, flowDepth, flowHasPrev],
  );

  const leave = useCallback(
    (fallback: string) => {
      if (flowHasPrev) nav(-flowDepth);
      else nav(fallback, { replace: true });
    },
    [nav, flowDepth, flowHasPrev],
  );

  return { go, leave };
}
