import { useSearchParams } from 'react-router';
import { Shell } from '../components/Layout';
import { foundText, introText, supportKinds } from '../features/support/support';
import { SupportDesktop, SupportMobile } from '../features/support/SupportViews';
import { useSupport } from '../features/support/useSupport';
import { useBack } from '../lib/useBack';
import { useIsDesktop } from '../lib/useMedia';

/** Apoio: entidades que ajudam em situações ilegais no trabalho, avisos da moderação e conselhos */
export default function Apoio() {
  const desktop = useIsDesktop();
  const { support, notices } = useSupport();
  const onBack = useBack('/perfil');
  const [params] = useSearchParams();
  const kinds = supportKinds(support, params.get('temas'));
  const props = { intro: introText(support, desktop, kinds), found: foundText(support), notices, kinds, onBack };
  return desktop ? (
    <Shell chrome="header">
      <SupportDesktop {...props} />
    </Shell>
  ) : (
    <Shell>
      <SupportMobile {...props} />
    </Shell>
  );
}
