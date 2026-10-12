import { Fragment, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Dots } from '../components/Data';
import { CRITERIA, CRITERION, type CriterionKey } from '../data/criteria';
import { BAD_TAGS, REVIEW_TAGS } from '../data/content';
import type { Scores } from '../data/orgs';
import { fmt } from '../lib/format';

/** Partes partilhadas entre os ecrãs do fluxo de avaliar (só usadas pelas páginas Avaliar*). */

export const DISPLAY: CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 600, margin: 0 };

/** Ordem dos critérios no mobile (Respeito primeiro, como no design) */
export const MOBILE_ORDER: CriterionKey[] = ['respeito', 'salario', 'equilibrio', 'ambiente', 'lideranca', 'estabilidade', 'progressao', 'proposito'];
/** Ordem dos critérios no desktop (ordem canónica) */
export const DESKTOP_ORDER: CriterionKey[] = CRITERIA.map((c) => c.key);

export const scoreOf = (scores: Partial<Scores>, k: CriterionKey) => {
  const v = scores[k];
  return typeof v === 'number' && v > 0 ? v : 0;
};
export const countDone = (scores: Partial<Scores>) => DESKTOP_ORDER.filter((k) => scoreOf(scores, k) > 0).length;

/** Cabeçalho mobile dos ecrãs de fluxo: botão redondo à esquerda e conteúdo à direita */
export function FlowHead({ icon, label, onClick, right }: { icon: 'close' | 'back'; label: string; onClick: () => void; right?: ReactNode }) {
  return (
    <div className="row between" style={{ gap: 12, minHeight: 44 }}>
      <button type="button" className="icon-btn" aria-label={label} onClick={onClick}>
        <Icon name={icon} size={18} />
      </button>
      {right}
    </div>
  );
}

/** Indicador de passos mobile (3 barras de 24px + 1/3) */
export function MiniSteps({ current, done = false }: { current: number; done?: boolean }) {
  return (
    <div role="img" aria-label={`Passo ${current} de 3${done ? ', concluído' : ''}`} className="row" style={{ gap: 10 }}>
      <span className="row" style={{ gap: 4 }}>
        {[1, 2, 3].map((i) => (
          <span key={i} style={{ width: 24, height: 4, borderRadius: 2, background: i <= current ? 'var(--teal)' : 'var(--field)' }} />
        ))}
      </span>
      <span className="mono small muted">{current}/3</span>
    </div>
  );
}

const STEP_LABELS = ['Organização', 'Verificação', 'Avaliação'];
const STEP_ROUTES = ['/avaliar', '/avaliar/verificar', '/avaliar/notas'];

/** Indicador de passos desktop: passos feitos são ligações, o actual a teal, os seguintes a cinzento */
export function DeskSteps({ current, right }: { current: 1 | 2 | 3; right?: ReactNode }) {
  const circle: CSSProperties = {
    width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, flex: 'none',
  };
  return (
    <div className="row wrap between" style={{ gap: 16, paddingTop: 16 }}>
      <ol aria-label={`Passo ${current} de 3`} className="row wrap" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 12 }}>
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const isDone = n < current;
          const isCur = n === current;
          return (
            <li key={label} aria-current={isCur ? 'step' : undefined} className="row" style={{ gap: 10 }}>
              {i > 0 && <span aria-hidden="true" style={{ width: 32, height: 2, background: n <= current ? 'var(--teal)' : 'var(--field)' }} />}
              {isDone ? (
                <Link to={STEP_ROUTES[i]} aria-label={`Passo ${n}, ${label}, feito`} style={{ ...circle, border: '3px solid var(--teal)', background: 'var(--surface)', color: 'var(--ink)', width: 44, height: 44, borderRadius: 22 }}>
                  <Icon name="check" size={16} stroke={2.4} />
                </Link>
              ) : (
                <span style={{ ...circle, ...(isCur ? { background: 'var(--teal)', color: 'var(--ink)' } : { border: '2px solid var(--field)', color: 'var(--muted)' }) }}>{n}</span>
              )}
              <span style={{ fontSize: 15, fontWeight: isCur ? 600 : 500, color: isDone ? 'var(--teal-dark)' : isCur ? 'var(--ink)' : 'var(--muted)' }}>{label}</span>
            </li>
          );
        })}
      </ol>
      {right}
    </div>
  );
}

/** Uma linha de critério com os botões 1–5 circulares */
export function ScoreRow({
  k,
  value,
  onPick,
  desktop = false,
  help,
}: {
  k: CriterionKey;
  value: number;
  onPick: (n: number) => void;
  desktop?: boolean;
  help?: { open: boolean; toggle: () => void };
}) {
  const c = CRITERION[k];
  const isR = k === 'respeito';
  const col = isR ? 'var(--purple)' : 'var(--teal)';
  const dot = desktop ? 34 : 30;
  return (
    <div className="stack" style={desktop ? { borderBottom: '1px solid #EEF0F1' } : undefined}>
      <div
        role="radiogroup"
        aria-label={c.label}
        style={
          desktop
            ? { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px 16px', alignItems: 'center', minHeight: 52 }
            : { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 6, alignItems: 'center', minHeight: 48 }
        }
      >
        <span className="row" style={{ gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: desktop ? 16 : 15, fontWeight: 600, lineHeight: 1.15, color: isR ? 'var(--purple-text)' : 'var(--ink)' }}>{c.label}</span>
          {help && (
            <button
              type="button"
              onClick={help.toggle}
              aria-expanded={help.open}
              aria-label={`O que conta em ${c.label}`}
              style={{ flex: 'none', width: 32, height: 44, border: 0, background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span
                style={{
                  width: 18, height: 18, borderRadius: 9, border: `1.5px solid ${help.open ? 'var(--ink)' : 'var(--muted)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, color: help.open ? 'var(--ink)' : 'var(--muted)', background: help.open ? 'var(--line)' : 'transparent',
                }}
              >
                ?
              </span>
            </button>
          )}
        </span>
        <span className="row" style={{ gap: desktop ? 2 : 0 }}>
          {[1, 2, 3, 4, 5].map((n) => {
            const on = n <= value;
            return (
              <button
                key={n}
                type="button"
                className="score-dot"
                role="radio"
                aria-checked={n === value}
                aria-label={`${c.label}, ${n} de 5`}
                onClick={() => onPick(n === value ? 0 : n)}
                style={{ width: desktop ? 44 : 42, height: 44, border: 0, background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span
                  style={{
                    width: dot, height: dot, borderRadius: dot / 2, border: `3px solid ${on ? col : desktop ? 'var(--grey)' : '#C9CDD0'}`, background: on ? col : 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: desktop ? 13 : 11,
                    color: on ? (isR ? '#fff' : 'var(--ink)') : desktop ? 'var(--body)' : 'var(--muted)', transition: 'background .15s, border-color .15s',
                  }}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </span>
      </div>
      {help?.open && (
        <div className="fade-up" style={{ fontSize: 13, color: 'var(--body)', paddingBottom: 8 }}>
          {c.hint}.
        </div>
      )}
    </div>
  );
}

/** Botões Sim / Não de "Recomendavas a um amigo?" */
export function RecommendButtons({ value, onChange, desktop = false }: { value: boolean | null; onChange: (v: boolean | null) => void; desktop?: boolean }) {
  return (
    <div role="group" aria-label="Recomendavas a um amigo?" className="row" style={{ gap: desktop ? 8 : 6 }}>
      {[
        { l: 'Sim', v: true },
        { l: 'Não', v: false },
      ].map((r) => {
        const on = value === r.v;
        return (
          <button
            key={r.l}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? null : r.v)}
            style={{
              height: 44, minWidth: desktop ? 76 : undefined, padding: desktop ? '0 20px' : '0 18px', borderRadius: 999, border: `1px solid ${on ? 'var(--ink)' : 'var(--field)'}`,
              background: on ? 'var(--ink)' : 'var(--surface)', color: on ? '#fff' : 'var(--ink)', fontSize: 15, fontWeight: 600,
            }}
          >
            {r.l}
          </button>
        );
      })}
    </div>
  );
}

/** Etiquetas (as más ficam a roxo quando escolhidas). Mostra `visible` + as escolhidas, e um botão +N */
export function TagPicker({ tags, onToggle, visible, badFirst = false, desktop = false }: { tags: string[]; onToggle: (t: string) => void; visible: number; badFirst?: boolean; desktop?: boolean }) {
  const [more, setMore] = useState(false);
  const all = badFirst ? [...BAD_TAGS, ...REVIEW_TAGS.filter((t) => !BAD_TAGS.includes(t))] : REVIEW_TAGS;
  const shown = all.filter((t, i) => more || i < visible || tags.includes(t));
  const hidden = all.length - shown.length;
  return (
    <div role="group" aria-label="O que se destaca?" className="chips" style={{ gap: desktop ? 8 : 6 }}>
      {shown.map((t) => (
        <button
          key={t}
          type="button"
          className={'chip' + (BAD_TAGS.includes(t) ? ' bad' : '')}
          aria-pressed={tags.includes(t)}
          onClick={() => onToggle(t)}
          style={{ height: 44, fontSize: desktop ? 14 : 13, padding: desktop ? '0 16px' : '0 14px' }}
        >
          {t}
        </button>
      ))}
      {(hidden > 0 || more) && (
        <button
          type="button"
          className="chip"
          aria-expanded={more}
          aria-label={more ? 'Mostrar menos etiquetas' : `Ver mais ${hidden} etiquetas`}
          onClick={() => setMore(!more)}
          style={{ height: 44, border: desktop ? '1px dashed var(--grey)' : 0, background: 'transparent', color: desktop ? 'var(--body)' : 'var(--teal-text)', fontWeight: 600, fontSize: desktop ? 14 : 13 }}
        >
          {more ? 'Menos' : `+${hidden}`}
        </button>
      )}
    </div>
  );
}

/** Grelha das 8 notas (bolinhas) */
export function NotesGrid({ scores, desktop = false }: { scores: Partial<Scores>; desktop?: boolean }) {
  return (
    <div
      className="fade-up"
      style={
        desktop
          ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))', gap: '18px 24px' }
          : { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px 16px', paddingBottom: 8 }
      }
    >
      {MOBILE_ORDER.map((k) => {
        const v = scoreOf(scores, k);
        return (
          <Fragment key={k}>
            <div className="stack" style={{ gap: 5 }}>
              <span style={{ fontSize: 13, color: 'var(--body)' }}>{CRITERION[k].short}</span>
              <span className="row" style={{ gap: 6 }}>
                <Dots value={v} color={CRITERION[k].color} size={desktop ? 13 : 12} gap={desktop ? 4 : 3} />
                <span className="mono" style={{ fontSize: 13 }}>{v ? fmt(v) : '—'}</span>
                <span className="sr-only">{CRITERION[k].label}: {v ? `${v} de 5` : 'sem nota'}</span>
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

/** Linha "Publicação anónima" com cadeado */
export function LockLine({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <span className="row small muted" style={{ gap: 8, justifyContent: center ? 'center' : undefined }}>
      <Icon name="lock" size={14} />
      {children}
    </span>
  );
}
