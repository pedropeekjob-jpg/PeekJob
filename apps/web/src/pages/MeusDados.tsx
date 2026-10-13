import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiMode } from '../api/http';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Layout';
import { TopBar } from '../components/UI';
import { tr } from '../i18n';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';

/** RGPD: ver o que guardamos, descarregar os dados e apagar a conta */
export default function MeusDados() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const { user, exportMyData, deleteAccount } = useStore();
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [keepReviews, setKeepReviews] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const download = async () => {
    setBusy('export');
    setError('');
    const r = await exportMyData();
    setBusy(null);
    if (!r.ok) return setError(r.message);
    const url = URL.createObjectURL(r.value!.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = r.value!.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const remove = async () => {
    setBusy('delete');
    setError('');
    const r = await deleteAccount(keepReviews);
    setBusy(null);
    if (!r.ok) return setError(r.message);
    setDeleted(true);
  };

  const wrap = (children: React.ReactNode) => (
    <Shell nav={!desktop}>
      <div className={desktop ? 'container dpage' : 'page'} style={{ maxWidth: desktop ? 760 : undefined }}>
        {!desktop && <TopBar back="/perfil" title={tr('Os teus dados', 'Your data')} />}
        {children}
      </div>
    </Shell>
  );

  if (deleted) {
    return wrap(
      <div className="stack" style={{ gap: 16 }} role="status">
        <h1 className="h1">{tr('A tua conta foi apagada.', 'Your account has been deleted.')}</h1>
        <p className="lead">
          {keepReviews
            ? tr('As tuas avaliações continuam publicadas, mas já não estão ligadas a ti.', 'Your reviews stay published, but they are no longer linked to you.')
            : tr('Apagámos também as tuas avaliações, verificações e mensagens.', 'We also deleted your reviews, verifications and messages.')}
        </p>
        <Link to="/" className="btn btn-dark" style={{ alignSelf: 'flex-start' }}>
          {tr('Voltar ao início', 'Back to the home page')}
        </Link>
      </div>,
    );
  }

  if (apiMode && !user) {
    return wrap(
      <div className="stack" style={{ gap: 16 }}>
        <h1 className="h1">{tr('Os teus dados', 'Your data')}</h1>
        <p className="lead">{tr('Entra para descarregar ou apagar os teus dados.', 'Sign in to download or delete your data.')}</p>
        <button type="button" className="btn btn-dark" style={{ alignSelf: 'flex-start' }} onClick={() => nav('/entrar')}>
          {tr('Entrar', 'Sign in')}
        </button>
      </div>,
    );
  }

  const kept = [
    tr('O teu email não é guardado: só um código derivado dele, que não permite recuperá-lo.', 'We don’t store your email: only a one-way code derived from it.'),
    tr('As tuas avaliações, ligadas a ti por um pseudónimo que nunca sai do servidor.', 'Your reviews, linked to you by a pseudonym that never leaves our server.'),
    tr('As verificações: só o “sim” (sem o email de trabalho nem o documento).', 'Verifications: only the “yes” (never the work email or the document).'),
    tr('As tuas mensagens privadas e as denúncias que fizeste.', 'Your private messages and the reports you made.'),
  ];

  return wrap(
    <div className="stack" style={{ gap: 28 }}>
      <div className="stack" style={{ gap: 10 }}>
        {desktop && <h1 className="h1">{tr('Os teus dados', 'Your data')}</h1>}
        <p className="lead" style={{ margin: 0 }}>
          {tr('O que guardamos sobre ti, e como o levas ou apagas.', 'What we keep about you, and how to take it with you or delete it.')}
        </p>
      </div>

      <ul className="stack" style={{ gap: 10, margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 1.5 }}>
        {kept.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ul>

      <section className="card stack" style={{ gap: 12, padding: 22 }} aria-labelledby="dl-h">
        <h2 id="dl-h" className="h2" style={{ fontSize: 20 }}>{tr('Descarregar os meus dados', 'Download my data')}</h2>
        <p className="body" style={{ margin: 0 }}>{tr('Um ficheiro JSON com tudo o que está ligado à tua conta.', 'A JSON file with everything linked to your account.')}</p>
        <button type="button" className="btn btn-dark" style={{ alignSelf: 'flex-start' }} onClick={download} disabled={busy !== null}>
          <Icon name="down" size={18} /> {busy === 'export' ? tr('A preparar…', 'Preparing…') : tr('Descarregar', 'Download')}
        </button>
      </section>

      <section className="card stack" style={{ gap: 12, padding: 22, borderColor: 'var(--warn-line)' }} aria-labelledby="del-h">
        <h2 id="del-h" className="h2" style={{ fontSize: 20 }}>{tr('Apagar a minha conta', 'Delete my account')}</h2>
        <p className="body" style={{ margin: 0 }}>
          {tr('Não dá para desfazer. Podes voltar a entrar com o mesmo email, mas começas do zero.', 'This can’t be undone. You can sign in again with the same email, but you’ll start from scratch.')}
        </p>
        {!confirming ? (
          <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start', color: 'var(--down)' }} onClick={() => setConfirming(true)}>
            {tr('Apagar a minha conta', 'Delete my account')}
          </button>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            <label className="row" style={{ gap: 10, alignItems: 'flex-start', fontSize: 15 }}>
              <input type="checkbox" checked={keepReviews} onChange={(e) => setKeepReviews(e.target.checked)} style={{ marginTop: 4 }} />
              <span>
                {tr('Manter as minhas avaliações publicadas, sem ligação a mim', 'Keep my reviews published, no longer linked to me')}
              </span>
            </label>
            <div className="row wrap" style={{ gap: 10 }}>
              <button type="button" className="btn" style={{ background: 'var(--down)', color: '#fff' }} onClick={remove} disabled={busy !== null}>
                {busy === 'delete' ? tr('A apagar…', 'Deleting…') : tr('Apagar definitivamente', 'Delete permanently')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={busy !== null}>
                {tr('Cancelar', 'Cancel')}
              </button>
            </div>
          </div>
        )}
      </section>

      {error && (
        <span role="alert" className="small" style={{ color: 'var(--warn-text)', fontWeight: 600 }}>
          {error}
        </span>
      )}
    </div>,
  );
}
