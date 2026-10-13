import { Link } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { LogoAnimated } from '../components/Brand';
import { Icon } from '../components/Icon';
import { tr } from '../i18n';
import { useIsDesktop } from '../lib/useMedia';
import styles from './NotFound.module.css';

export default function NotFound() {
  const desktop = useIsDesktop();
  return (
    <Shell nav>
      <div className={desktop ? 'container dpage' : 'page'}>
        <section className={`stack fade-up ${styles.box}`}>
          <LogoAnimated width={desktop ? 280 : 200} label={tr('PeekJob à procura do caminho', 'PeekJob looking for the way')} />
          <p className={`label ${styles.code}`}>{tr('Erro 404', 'Error 404')}</p>
          <h1 className="h1">{tr('Não encontrámos esse caminho', 'We couldn’t find that page')}</h1>
          <p className="lead">
            {tr(
              'A página que procuras não existe ou mudou de sítio. Volta ao início ou procura uma organização.',
              'The page you’re looking for doesn’t exist or has moved. Go back home or search for an organisation.',
            )}
          </p>
          <div className={`row wrap ${styles.actions}`}>
            <Link to="/" className={`btn btn-primary ${styles.action}`}>
              <Icon name="home" size={18} />
              {tr('Voltar ao início', 'Back to home')}
            </Link>
            <Link to="/pesquisa" className={`btn btn-ghost ${styles.action}`}>
              <Icon name="search" size={18} />
              {tr('Procurar uma organização', 'Search for an organisation')}
            </Link>
          </div>
        </section>
      </div>
    </Shell>
  );
}
