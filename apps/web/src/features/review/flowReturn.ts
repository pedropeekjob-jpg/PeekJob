/** Destino a abrir depois de sair do fluxo (ver useFlowNav.leaveTo e <FlowReturn />) */
let pending: string | null = null;

export const setPendingReturn = (to: string) => {
  pending = to;
};

/** Lê e limpa o destino pendente */
export const takePendingReturn = () => {
  const t = pending;
  pending = null;
  return t;
};
