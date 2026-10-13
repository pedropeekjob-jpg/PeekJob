import { useId, type CSSProperties } from 'react';
import './logoAnimated.css';
import { LOGO_ANIMATED_SVG } from './logoAnimatedSvg';
import { tr } from '../i18n';
import styles from './Brand.module.css';

const base = import.meta.env.BASE_URL;

export function Logo({ height = 44, dark = false }: { height?: number; dark?: boolean }) {
  return <img src={`${base}${dark ? 'logo-dark.svg' : 'logo-light.svg'}`} alt="PeekJob" height={height} className={styles.logo} />;
}

/** Logo animado (olhos, caminho e lupa). Para loadings: mínimo 160px de largura. */
export function LogoAnimated({ width = 250, dark = false, label = tr('A carregar', 'Loading') }: { width?: number; dark?: boolean; label?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const html = LOGO_ANIMATED_SVG.split('{uid}').join(uid).replace('aria-label="PeekJob"', `aria-label="${label}"`);
  return <div className={styles.animated} data-dark={dark || undefined} style={{ '--w': `${width}px` } as CSSProperties} dangerouslySetInnerHTML={{ __html: html }} />;
}
