import { tr } from '../i18n';

/** Faixa no topo quando a API diz que é o ambiente de testes (UAT) */
export function EnvRibbon() {
  if (window.__PJ__?.env !== 'uat') return null;
  return (
    <div role="note" className="env-ribbon">
      <strong>UAT</strong> · {tr('Ambiente de testes: os dados podem ser apagados a qualquer momento.', 'Test environment: data may be wiped at any time.')}
    </div>
  );
}
