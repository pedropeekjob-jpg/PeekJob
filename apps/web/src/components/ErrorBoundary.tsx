import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { tr } from '../i18n';
import { reportError } from '../lib/monitoring';
import { Icon } from './Icon';

/**
 * Se um ecrã rebentar, mostra uma página simples em vez de um ecrã branco e reporta o erro.
 * `resetKey` (o caminho) limpa o erro ao mudar de ecrã.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean; key: string }> {
  state = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromProps(props: { resetKey: string }, state: { failed: boolean; key: string }) {
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null;
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportError(error, location.href);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="page" style={{ minHeight: '80dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <section role="alert" className="stack fade-up" style={{ alignItems: 'center', textAlign: 'center', gap: 14, maxWidth: 480 }}>
          <p className="label">{tr('Erro', 'Error')}</p>
          <h1 className="h1">{tr('Algo correu mal neste ecrã', 'Something went wrong on this screen')}</h1>
          <p className="lead">
            {tr('Já fomos avisados. Tenta outra vez; o que escreveste no rascunho continua guardado.', 'We’ve been notified. Please try again; your draft is still saved.')}
          </p>
          <div className="row wrap" style={{ gap: 10, justifyContent: 'center', paddingTop: 6 }}>
            <button type="button" className="btn btn-primary" onClick={() => location.reload()}>
              {tr('Tentar outra vez', 'Try again')}
            </button>
            <Link to="/" className="btn btn-ghost">
              <Icon name="home" size={18} />
              {tr('Voltar ao início', 'Back to home')}
            </Link>
          </div>
        </section>
      </main>
    );
  }
}
