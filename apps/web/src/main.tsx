import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installClickTracking } from './analytics';
import { browserRouting } from './analytics/seo';
import './styles/global.css';

// Links antigos com # (ex.: o link mágico dos emails, /#/entrar?token=…) passam a URLs reais
if (browserRouting && location.hash.startsWith('#/')) history.replaceState(null, '', location.hash.slice(1));
installClickTracking();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
