import { Shell } from '../components/Layout';
import { RankingDesktop } from '../features/ranking/RankingDesktop';
import { RankingMobile } from '../features/ranking/RankingMobile';
import { useRanked, useRankingFilters } from '../features/ranking/useRanking';
import { useIsDesktop } from '../lib/useMedia';

/** Ranking de organizações (contentor: filtros no endereço, ordenação e escolha do layout) */
export default function Ranking() {
  const desktop = useIsDesktop();
  const F = useRankingFilters();
  const { ranked, prefs } = useRanked(F);
  return <Shell nav>{desktop ? <RankingDesktop ranked={ranked} F={F} prefs={prefs} /> : <RankingMobile ranked={ranked} F={F} />}</Shell>;
}
