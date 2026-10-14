import { useEffect, useState } from 'react';
import { tr } from '../i18n';
import { LogoAnimated } from './Brand';
import styles from './PageLoading.module.css';

/** Enquanto a página chega: nada nos primeiros 300 ms (evita piscar), depois o logo animado */
export function PageLoading() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <main id="conteudo" tabIndex={-1} className={styles.wrap} aria-busy="true">
      {show && <LogoAnimated width={170} label={tr('A carregar', 'Loading')} />}
    </main>
  );
}
