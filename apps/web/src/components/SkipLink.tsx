import { tr } from '../i18n';

/**
 * Primeiro elemento da página: só aparece com o teclado e salta o menu.
 * Não usa o # do endereço (a demo usa o HashRouter): põe o foco no <main id="conteudo">.
 */
export function SkipLink() {
  return (
    <a
      href="#conteudo"
      className="skip-link"
      onClick={(e) => {
        e.preventDefault();
        const main = document.getElementById('conteudo');
        if (!main) return;
        main.setAttribute('tabindex', '-1');
        main.focus();
      }}
    >
      {tr('Saltar para o conteúdo', 'Skip to content')}
    </a>
  );
}
