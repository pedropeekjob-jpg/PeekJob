import { Shell } from '../components/Layout';
import { usePrefsPicker } from '../features/preferences/usePrefsPicker';
import { PrefsDesktop, PrefsMobile } from '../features/preferences/PrefsViews';
import { useIsDesktop } from '../lib/useMedia';

/** Apresentação: escolher as 3 prioridades que ordenam tudo */
export default function Preferencias() {
  const desktop = useIsDesktop();
  const p = usePrefsPicker();
  return <Shell chrome="none">{desktop ? <PrefsDesktop p={p} /> : <PrefsMobile p={p} />}</Shell>;
}
