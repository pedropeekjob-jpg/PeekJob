import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { ExploreDesktop } from '../features/explore/ExploreDesktop';
import { ExploreMobile } from '../features/explore/ExploreMobile';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';

/** Início (/explorar): na primeira visita pede primeiro as prioridades */
export default function Inicio() {
  const { onboarded } = useStore();
  const navigate = useNavigate();
  const desktop = useIsDesktop();

  useEffect(() => {
    if (!onboarded) navigate('/preferencias', { replace: true });
  }, [onboarded, navigate]);

  if (!onboarded) return null;
  return <Shell nav>{desktop ? <ExploreDesktop /> : <ExploreMobile />}</Shell>;
}
