import { Shell } from '../components/Layout';
import { SearchDesktop } from '../features/search/SearchDesktop';
import { SearchMobile } from '../features/search/SearchMobile';
import { useSearchPage } from '../features/search/useSearchPage';
import { useIsDesktop } from '../lib/useMedia';

/** Pesquisa de organizações: o termo vive no endereço; resultados pela compatibilidade */
export default function Pesquisa() {
  const desktop = useIsDesktop();
  const s = useSearchPage();
  return <Shell chrome="full">{desktop ? <SearchDesktop s={s} /> : <SearchMobile s={s} />}</Shell>;
}
