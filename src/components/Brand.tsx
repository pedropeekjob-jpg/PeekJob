import { useId } from 'react';
import './logoAnimated.css';
import { LOGO_ANIMATED_SVG } from './logoAnimatedSvg';

const base = import.meta.env.BASE_URL;

export function Logo({ height = 44, dark = false }: { height?: number; dark?: boolean }) {
  return <img src={`${base}${dark ? 'logo-dark.svg' : 'logo-light.svg'}`} alt="PeekJob" style={{ height, width: 'auto' }} />;
}

/** Logo animado (olhos, caminho e lupa). Para loadings: mínimo 160px de largura. */
export function LogoAnimated({ width = 250, dark = false, label = 'A carregar' }: { width?: number; dark?: boolean; label?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const html = LOGO_ANIMATED_SVG.split('{uid}').join(uid).replace('aria-label="PeekJob"', `aria-label="${label}"`);
  const vars = dark ? ({ '--pj-ink': '#FFFFFF', '--pj-node': '#010B13', '--pj-road': '#2A3238', '--pj-bg': '#010B13' } as React.CSSProperties) : undefined;
  return <div style={{ width, maxWidth: '100%', ...vars }} dangerouslySetInnerHTML={{ __html: html }} />;
}
