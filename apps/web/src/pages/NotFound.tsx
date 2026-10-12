import { Link } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { LogoAnimated } from '../components/Brand';
import { Icon } from '../components/Icon';
import { tr } from '../i18n';
import { useIsDesktop } from '../lib/useMedia';

export default function NotFound() {
  const desktop = useIsDesktop();
  return (
    <Shell nav>
      <div className={desktop ? 'container dpage' : 'page'}>
        <section
          className="stack fade-up"
          style={{ alignItems: 'center', textAlign: 'center', gap: desktop ? 20 : 16, padding: desktop ? '40px 0 24px' : '40px 0 8px', maxWidth: 560, margin: '0 auto' }}
        >
          <LogoAnimated width={desktop ? 280 : 200} label={tr('PeekJob à procura do caminho', 'PeekJob looking for the way')} />
          <p className="label" style={{ marginTop: 8 }}>
            {tr('Erro 404', 'Error 404')}
          </p>
          <h1 className="h1">{tr('Não encontrámos esse caminho', 'We couldn’t find that page')}</h1>
          <p className="lead">
            {tr(
              'A página que procuras não existe ou mudou de sítio. Volta ao início ou procura uma organização.',
              'The page you’re looking for doesn’t exist or has moved. Go back home or search for an organisation.',
            )}
          </p>
          <div className="row wrap" style={{ gap: 10, justifyContent: 'center', paddingTop: 8, width: desktop ? undefined : '100%' }}>
            <Link to="/" className={'btn btn-primary' + (desktop ? '' : ' btn-block')}>
              <Icon name="home" size={18} />
              {tr('Voltar ao início', 'Back to home')}
            </Link>
            <Link to="/pesquisa" className={'btn btn-ghost' + (desktop ? '' : ' btn-block')}>
              <Icon name="search" size={18} />
              {tr('Procurar uma organização', 'Search for an organisation')}
            </Link>
          </div>
        </section>
      </div>
    </Shell>
  );
}
