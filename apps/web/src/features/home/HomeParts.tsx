import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { LogoAnimated } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { tr } from '../../i18n';
import { reviewHref, searchHref, type Zone } from './home';
import styles from './Home.module.css';

/** Textos de cada zona: título, uma linha a explicar e o nome do destino (para leitores de ecrã) */
export const ZONE_TEXT = {
  peek: {
    label: () => tr('Espreitar', 'Peek inside'),
    sub: () => tr('Vê como é trabalhar lá dentro.', 'See what it’s like to work there.'),
    hint: () => tr('Espreitar organizações', 'Peek at organisations'),
  },
  job: {
    label: () => tr('O teu trabalho', 'Your job'),
    sub: () => tr('Avalia onde trabalhas, sem dar a cara.', 'Review where you work, anonymously.'),
    hint: () => tr('Avaliar onde trabalho', 'Review where I work'),
  },
} as const;

interface DoorProps {
  zone: Zone;
  onOpen: (z: Zone) => void;
  focusOnMount: boolean;
}

/** Uma zona fechada: um botão que ocupa a zona inteira */
export function Door({ zone, onOpen, focusOnMount }: DoorProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);
  const t = ZONE_TEXT[zone];
  return (
    <button
      ref={ref}
      type="button"
      className={styles.door}
      aria-expanded={false}
      aria-controls={`zona-${zone}`}
      onClick={() => onOpen(zone)}
      data-ev="cta_click"
      data-ev-cta={zone === 'peek' ? 'abrir_espreitar' : 'abrir_avaliar'}
      data-ev-area="home"
    >
      {/* título grande à esquerda, com o chevron de "abre" (estilo iOS, 15/10) e uma linha em cinzento */}
      <span className={styles.doorText}>
        <span className={`row ${styles.label}`}>
          {t.label()}
          <Icon name="next" size={28} stroke={2.6} className={styles.chevron} />
        </span>
        <span className={styles.doorSub}>{t.sub()}</span>
      </span>
      <span className="sr-only">: {t.hint()}</span>
    </button>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className={`icon-btn ${styles.close}`} aria-label={tr('Voltar ao início', 'Back to the start')} onClick={onClose}>
      <Icon name="close" size={18} />
    </button>
  );
}

interface SearchFormProps {
  id: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  initial?: string;
  autoFocus: boolean;
  href: (q: string) => string;
  cta: string;
}

/** Campo de pesquisa a sério: Enter (ou a seta) leva ao destino com o que se escreveu */
function SearchForm({ id, label, placeholder, submitLabel, initial = '', autoFocus, href, cta }: SearchFormProps) {
  const nav = useNavigate();
  const [q, setQ] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    nav(href(q));
  };
  return (
    <form role="search" className={`row ${styles.search}`} onSubmit={submit} data-ev="cta_click" data-ev-cta={cta} data-ev-area="home">
      <Icon name="search" size={20} className={styles.searchIcon} />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- a pessoa acabou de escolher esta zona (só com teclado físico/rato)
        autoFocus={autoFocus}
      />
      <button type="submit" className={styles.go} aria-label={submitLabel}>
        <Icon name="arrow" size={20} />
      </button>
    </form>
  );
}

/** Espreitar aberto: título, pesquisa a sério (Enter leva aos resultados) e ligação para ver todas */
export function PeekPanel({ typed, autoFocus, onClose }: { typed: string; autoFocus: boolean; onClose: () => void }) {
  return (
    <section id="zona-peek" aria-labelledby="zona-peek-t" className={styles.panel}>
      <CloseButton onClose={onClose} />
      <span className={styles.eyebrow}>{ZONE_TEXT.peek.label()}</span>
      <h2 id="zona-peek-t" className={styles.title}>
        {tr('Como é trabalhar lá dentro?', 'What’s it really like to work there?')}
      </h2>
      <p className={styles.sub}>{tr('Procura uma organização e vê o que dizem as pessoas que lá trabalham.', 'Find an organisation and see what the people who work there say.')}</p>
      <SearchForm
        id="home-q"
        label={tr('Pesquisar organização', 'Search organisations')}
        placeholder={tr('Empresa, associação ou cidade', 'Company, association or city')}
        submitLabel={tr('Procurar', 'Search')}
        initial={typed}
        autoFocus={autoFocus}
        href={searchHref}
        cta="pesquisar"
      />
      {/* porta para o Explorar com o peso de um botão (14/10): era uma ligação pequena e passava despercebida */}
      <Link to="/explorar" className={`btn btn-ghost ${styles.browse}`} data-ev="cta_click" data-ev-cta="explorar" data-ev-area="home">
        {tr('Ver todas as organizações', 'See all organisations')}
        <Icon name="next" size={18} />
      </Link>
    </section>
  );
}

/** O teu trabalho aberto: "onde trabalhas?" já aqui (poupa um ecrã); Enter leva à escolha com a pesquisa feita */
export function JobPanel({ autoFocus, onClose }: { autoFocus: boolean; onClose: () => void }) {
  return (
    <section id="zona-job" aria-labelledby="zona-job-t" className={styles.panel}>
      <CloseButton onClose={onClose} />
      <span className={styles.eyebrow}>{ZONE_TEXT.job.label()}</span>
      <h2 id="zona-job-t" className={styles.title}>
        {tr('Conta como é. Sem dar a cara.', 'Tell it like it is. Stay anonymous.')}
      </h2>
      <p className={styles.sub}>{tr('Avaliação anónima em 3 minutos. A organização nunca sabe quem escreveu.', 'An anonymous review in 3 minutes. The organisation never knows who wrote it.')}</p>
      <SearchForm
        id="home-job"
        label={tr('Onde trabalhas?', 'Where do you work?')}
        placeholder={tr('Onde trabalhas?', 'Where do you work?')}
        submitLabel={tr('Avaliar onde trabalho', 'Review where I work')}
        autoFocus={autoFocus}
        href={reviewHref}
        cta="avaliar"
      />
      <Link to="/avaliar" className={`link ${styles.all}`} data-ev="cta_click" data-ev-cta="avaliar_lista" data-ev-area="home">
        {tr('Escolher da lista', 'Choose from the list')}
      </Link>
    </section>
  );
}

/**
 * Logo na fronteira: duas cópias sincronizadas, cortadas na linha.
 * Em cima (fundo teal): "peek" a tinta, perna do k a branco. Em baixo (fundo ink): "Job" a teal, "o" a branco.
 */
export function HomeMark() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return (
    <span className={styles.mark} data-ready={ready || undefined} aria-hidden="true">
      <span className={`${styles.mk} ${styles.mkTop}`}>
        <LogoAnimated width={264} label="PeekJob" />
      </span>
      <span className={`${styles.mk} ${styles.mkBot}`}>
        <LogoAnimated width={264} label="PeekJob" />
      </span>
    </span>
  );
}
