import { Link } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { LogoAnimated } from '../components/Brand';
import { Icon } from '../components/Icon';
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
          <LogoAnimated width={desktop ? 280 : 200} label="PeekJob à procura do caminho" />
          <p className="label" style={{ marginTop: 8 }}>
            Erro 404
          </p>
          <h1 className="h1">Não encontrámos esse caminho</h1>
          <p className="lead">A página que procuras não existe ou mudou de sítio. Volta ao início ou procura uma organização.</p>
          <div className="row wrap" style={{ gap: 10, justifyContent: 'center', paddingTop: 8, width: desktop ? undefined : '100%' }}>
            <Link to="/" className={'btn btn-primary' + (desktop ? '' : ' btn-block')}>
              <Icon name="home" size={18} />
              Voltar ao início
            </Link>
            <Link to="/pesquisa" className={'btn btn-ghost' + (desktop ? '' : ' btn-block')}>
              <Icon name="search" size={18} />
              Procurar uma organização
            </Link>
          </div>
        </section>
      </div>
    </Shell>
  );
}
