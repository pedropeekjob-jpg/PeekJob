import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { applyPageMeta, setOrgStructuredData } from '../../analytics/seo';
import type { CriterionKey } from '../../data/criteria';
import type { Org, Review } from '../../data/orgs';
import { tr } from '../../i18n';
import { orgTypeLabel } from '../../i18n/labels';
import { fmt, plural } from '../../lib/format';
import { match } from '../../lib/match';
import { useStore } from '../../lib/store';
import { splitCriteria, type OrgTab } from './org';

/** Título e descrição com o nome da organização + dados estruturados (Search Console: resultados com nota) */
export function useOrgMeta(org: Org | undefined, tab: OrgTab) {
  const { pathname } = useLocation();
  const name = org?.name;
  const score = org?.score ?? 0;
  const count = org?.reviewsCount ?? 0;
  useEffect(() => {
    if (!org || !name) return;
    const what = tab === 'salarios' ? tr('Salários', 'Salaries') : tab === 'entrevistas' ? tr('Entrevistas', 'Interviews') : tr('Avaliações', 'Reviews');
    const type = orgTypeLabel(org.type);
    applyPageMeta(pathname, {
      title: tr(`${name} · ${what} de quem lá trabalha · PeekJob`, `${name} · ${what} from people who work there · PeekJob`),
      description: count
        ? tr(
            `${type} em ${org.city}. Nota ${fmt(score)} em ${plural(count, 'avaliação anónima', 'avaliações anónimas')} de quem lá trabalha.`,
            `${type} in ${org.city}. Score ${fmt(score)} from ${plural(count, 'anonymous review', 'anonymous reviews')} by people who work there.`,
          )
        : tr(`${type} em ${org.city}. Ainda sem avaliações: se trabalhas lá, sê a primeira pessoa a avaliar.`, `${type} in ${org.city}. No reviews yet: if you work there, be the first to review it.`),
    });
    setOrgStructuredData(tab === 'avaliacoes' ? { name, score, reviewsCount: count } : null);
    return () => setOrgStructuredData(null);
    // só muda quando mudam estes valores (o objeto org é recriado a cada carregamento)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, name, score, count, tab]);
}

/** Dados de base e a ação principal: começar a avaliar esta organização */
export function useOrgActions(org: Org) {
  const { prefs, startDraft } = useStore();
  const nav = useNavigate();
  const has = org.reviewsCount > 0;
  // compatibilidade com as prioridades da pessoa (8 critérios × pesos): só recalcula quando mudam
  const m = useMemo(() => match(org, prefs), [org, prefs]);
  const startReview = useCallback(() => {
    startDraft(org.id, org.locations[0]?.id ?? null);
    nav('/avaliar/verificar');
  }, [nav, org.id, org.locations, startDraft]);
  return { has, m, startReview };
}

/** Critérios: prioridades da pessoa primeiro, os outros à parte */
export function useCriteria(org: Org) {
  const { prefs } = useStore();
  const split = useMemo(() => splitCriteria(prefs), [prefs]);
  return { ...split, value: (k: CriterionKey) => org.scores[k] };
}

/** "Útil": marcado por mim e contagem com o meu voto */
export function useUseful() {
  const { useful, toggleUseful } = useStore();
  return {
    isOn: (r: Review) => !!useful[r.id],
    count: (r: Review) => r.useful + (useful[r.id] ? 1 : 0),
    toggle: (r: Review) => toggleUseful(r.id),
  };
}
