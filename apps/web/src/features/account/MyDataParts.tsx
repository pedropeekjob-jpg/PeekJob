import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { tr } from '../../i18n';
import { deletedText, deleteLabel, downloadLabel, KEPT } from './myData';
import type { MyData } from './useMyData';
import styles from './MyData.module.css';

export const TITLE = () => tr('Os teus dados', 'Your data');

export function Deleted({ keepReviews }: { keepReviews: boolean }) {
  return (
    <div className={styles.stack16} role="status">
      <h1 className="h1">{tr('A tua conta foi apagada.', 'Your account has been deleted.')}</h1>
      <p className="lead">{deletedText(keepReviews)}</p>
      <Link to="/" className={`btn btn-dark ${styles.start}`}>
        {tr('Voltar ao início', 'Back to the home page')}
      </Link>
    </div>
  );
}

export function SignInFirst() {
  const nav = useNavigate();
  return (
    <div className={styles.stack16}>
      <h1 className="h1">{TITLE()}</h1>
      <p className="lead">{tr('Entra para descarregar ou apagar os teus dados.', 'Sign in to download or delete your data.')}</p>
      <button type="button" className={`btn btn-dark ${styles.start}`} onClick={() => nav('/entrar')}>
        {tr('Entrar', 'Sign in')}
      </button>
    </div>
  );
}

export function Kept() {
  return (
    <ul className={styles.kept}>
      {KEPT().map((k) => (
        <li key={k}>{k}</li>
      ))}
    </ul>
  );
}

export function DownloadCard({ d }: { d: MyData }) {
  return (
    <section className={`card ${styles.card}`} aria-labelledby="dl-h">
      <h2 id="dl-h" className={`h2 ${styles.h2}`}>
        {tr('Descarregar os meus dados', 'Download my data')}
      </h2>
      <p className={`body ${styles.text}`}>{tr('Um ficheiro JSON com tudo o que está ligado à tua conta.', 'A JSON file with everything linked to your account.')}</p>
      <button type="button" className={`btn btn-dark ${styles.start}`} onClick={d.download} disabled={d.busy !== null}>
        <Icon name="down" size={18} /> {downloadLabel(d.busy)}
      </button>
    </section>
  );
}

export function DeleteCard({ d }: { d: MyData }) {
  return (
    <section className={`card ${styles.card} ${styles.danger}`} aria-labelledby="del-h">
      <h2 id="del-h" className={`h2 ${styles.h2}`}>
        {tr('Apagar a minha conta', 'Delete my account')}
      </h2>
      <p className={`body ${styles.text}`}>
        {tr('Não dá para desfazer. Podes voltar a entrar com o mesmo email, mas começas do zero.', 'This can’t be undone. You can sign in again with the same email, but you’ll start from scratch.')}
      </p>
      {d.confirming ? (
        <div className={styles.confirm}>
          <label className={`row ${styles.keep}`}>
            <input type="checkbox" checked={d.keepReviews} onChange={(e) => d.setKeepReviews(e.target.checked)} className={styles.checkbox} />
            <span>{tr('Manter as minhas avaliações publicadas, sem ligação a mim', 'Keep my reviews published, no longer linked to me')}</span>
          </label>
          <div className={`row wrap ${styles.actions}`}>
            <button type="button" className={`btn ${styles.deleteNow}`} onClick={d.remove} disabled={d.busy !== null}>
              {deleteLabel(d.busy)}
            </button>
            <button type="button" className="btn btn-ghost" onClick={d.cancelDelete} disabled={d.busy !== null}>
              {tr('Cancelar', 'Cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={`btn btn-ghost ${styles.start} ${styles.deleteAsk}`} onClick={d.askDelete}>
          {tr('Apagar a minha conta', 'Delete my account')}
        </button>
      )}
    </section>
  );
}
