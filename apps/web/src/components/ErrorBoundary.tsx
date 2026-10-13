import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { tr } from '../i18n';
import { reportError } from '../lib/monitoring';
import { Icon } from './Icon';
import styles from './ErrorBoundary.module.css';

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
      <main className={`page ${styles.page}`}>
        <section role="alert" className={`stack fade-up ${styles.box}`}>
          <p className="label">{tr('Erro', 'Error')}</p>
          <h1 className="h1">{tr('Algo correu mal neste ecrã', 'Something went wrong on this screen')}</h1>
          <p className="lead">
            {tr('Já fomos avisados. Tenta outra vez; o que escreveste no rascunho continua guardado.', 'We’ve been notified. Please try again; your draft is still saved.')}
          </p>
          <div className={`row wrap ${styles.actions}`}>
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
