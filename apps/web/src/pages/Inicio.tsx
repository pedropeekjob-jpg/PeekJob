import { Shell } from '../components/Layout';
import { ExploreDesktop } from '../features/explore/ExploreDesktop';
import { ExploreMobile } from '../features/explore/ExploreMobile';
import { useIsDesktop } from '../lib/useMedia';

/**
 * Explorar (/explorar). Abre sempre logo (14/10): na primeira visita mostra as mais bem avaliadas
 * e convida a escolher prioridades, em vez de obrigar ao questionário antes de ver organizações.
 */
export default function Inicio() {
  const desktop = useIsDesktop();
  return <Shell nav>{desktop ? <ExploreDesktop /> : <ExploreMobile />}</Shell>;
}
