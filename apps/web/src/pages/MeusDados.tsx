import type { ReactNode } from 'react';
import { Shell } from '../components/Layout';
import { TopBar } from '../components/UI';
import { DeleteCard, Deleted, DownloadCard, Kept, SignInFirst, TITLE } from '../features/account/MyDataParts';
import styles from '../features/account/MyData.module.css';
import { useMyData } from '../features/account/useMyData';
import { tr } from '../i18n';
import { useIsDesktop } from '../lib/useMedia';

/** RGPD: ver o que guardamos, descarregar os dados e apagar a conta */
export default function MeusDados() {
  const desktop = useIsDesktop();
  const d = useMyData();

  const frame = (children: ReactNode) => (
    <Shell nav={!desktop}>
      <div className={desktop ? `container dpage ${styles.wide}` : 'page'}>
        {!desktop && <TopBar back="/perfil" title={TITLE()} />}
        {children}
      </div>
    </Shell>
  );

  if (d.deleted) return frame(<Deleted keepReviews={d.keepReviews} />);
  if (d.needsSignIn) return frame(<SignInFirst />);
  return frame(
    <div className={styles.main}>
      <div className={styles.intro}>
        {desktop && <h1 className="h1">{TITLE()}</h1>}
        <p className={`lead ${styles.lead}`}>{tr('O que guardamos sobre ti, e como o levas ou apagas.', 'What we keep about you, and how to take it with you or delete it.')}</p>
      </div>
      <Kept />
      <DownloadCard d={d} />
      <DeleteCard d={d} />
      {d.error && (
        <span role="alert" className={`small ${styles.error}`}>
          {d.error}
        </span>
      )}
    </div>,
  );
}
