import { memo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Dots } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { PARAM_COMMENT_MAX } from '@peekjob/shared';
import { CRITERION } from '../../data/criteria';
import { EXTRA, paramMeta, type ExtraKey, type ParamKey } from '../../data/params';
import type { Scores } from '../../data/orgs';
import { tr } from '../../i18n';
import { tagLabel } from '../../i18n/labels';
import { fmt } from '../../lib/format';
import { isBadTag, MOBILE_ORDER, scoreOf, scoreWord, STEP_LABELS, STEPS_TOTAL, stepState, tagOrder, visibleTags } from './flow';
import styles from './Flow.module.css';

/** Partes partilhadas pelos ecrãs do fluxo de avaliar */

/** Cabeçalho do telemóvel: botão redondo à esquerda e conteúdo à direita */
export function FlowHead({ icon, label, onClick, right }: { icon: 'close' | 'back'; label: string; onClick: () => void; right?: ReactNode }) {
  return (
    <div className={`row between ${styles.head}`}>
      <button type="button" className="icon-btn" aria-label={label} onClick={onClick}>
        <Icon name={icon} size={18} />
      </button>
      {right}
    </div>
  );
}

/** Indicador de passos do telemóvel (uma barra por passo + 1/3) */
export const MiniSteps = memo(function MiniSteps({ current, done = false }: { current: number; done?: boolean }) {
  return (
    <div role="img" aria-label={tr(`Passo ${current} de ${STEPS_TOTAL}${done ? ', concluído' : ''}`, `Step ${current} of ${STEPS_TOTAL}${done ? ', done' : ''}`)} className={`row ${styles.mini}`}>
      <span className={`row ${styles.bars}`}>
        {Array.from({ length: STEPS_TOTAL }, (_, i) => (
          <span key={i} className={styles.bar} data-on={i < current || undefined} />
        ))}
      </span>
      <span className="mono small muted">
        {current}/{STEPS_TOTAL}
      </span>
    </div>
  );
});

/**
 * Indicador de passos do computador: passos feitos são botões (voltar a esse passo), o atual a verde-água,
 * os seguintes a cinzento. Só a escolha da organização se pode refazer (com `onChange`, que decide como lá voltar:
 * recuar no histórico em vez de abrir uma entrada nova); depois de publicar, os passos feitos já não são botões.
 */
export function DeskSteps({ current, right, onChange }: { current: 1 | 2 | 3; right?: ReactNode; onChange?: () => void }) {
  return (
    <div className={`row wrap between ${styles.desk}`}>
      <ol aria-label={tr(`Passo ${current} de ${STEPS_TOTAL}`, `Step ${current} of ${STEPS_TOTAL}`)} className={`row wrap ${styles.steps}`}>
        {STEP_LABELS().map((label, i) => {
          const n = i + 1;
          const state = stepState(n, current);
          return (
            <li key={label} aria-current={state === 'current' ? 'step' : undefined} className={`row ${styles.step}`} data-state={state}>
              {i > 0 && <span aria-hidden="true" className={styles.link} data-on={n <= current || undefined} />}
              {state === 'done' && n === 1 && onChange ? (
                <button type="button" onClick={onChange} aria-label={tr(`Passo ${n}, ${label}, feito`, `Step ${n}, ${label}, done`)} className={`${styles.circle} ${styles.circleDone}`}>
                  <Icon name="check" size={16} stroke={2.4} />
                </button>
              ) : state === 'done' ? (
                <span className={`${styles.circle} ${styles.circleDone}`}>
                  <Icon name="check" size={16} stroke={2.4} />
                  <span className="sr-only">{tr('Feito:', 'Done:')}</span>
                </span>
              ) : (
                <span className={styles.circle}>{n}</span>
              )}
              <span className={styles.stepLabel}>{label}</span>
            </li>
          );
        })}
      </ol>
      {right}
    </div>
  );
}

/**
 * Ícone de ajuda (?) com a explicação do critério (21/10): aparece ao passar o rato ou com o foco,
 * e fica aberta ao tocar (ecrãs táteis). Escape fecha.
 */
export function HelpTip({ id, label, text }: { id: string; label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const tipId = `${id}-ajuda`;
  return (
    <span className={styles.tipWrap} data-open={open || undefined}>
      <button
        type="button"
        className={styles.help}
        aria-label={tr(`O que conta em ${label}`, `What counts in ${label}`)}
        aria-expanded={open}
        aria-describedby={tipId}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        onBlur={() => setOpen(false)}
      >
        <Icon name="help" size={18} stroke={2} />
      </button>
      <span id={tipId} role="tooltip" className={styles.tip}>
        {text}
      </span>
    </span>
  );
}

/** Comentário curto num critério ou parâmetro (21/10: um por parâmetro em vez de um só no fim) */
interface CommentProps<K extends ParamKey> {
  comment?: string;
  onComment?: (k: K, t: string) => void;
  /** o comentário tem nomes ou insultos */
  invalid?: boolean;
}

/** "Comentar": abre uma caixa curta por baixo; fica aberta se já houver texto */
function ParamComment<K extends ParamKey>({ k, label, comment = '', onComment, invalid = false }: CommentProps<K> & { k: K; label: string }) {
  const [open, setOpen] = useState(!!comment);
  if (!onComment) return null;
  const boxId = `comentario-${k}`;
  return (
    <div className={styles.paramComment}>
      {!open ? (
        <button type="button" className={`link ${styles.commentToggle}`} aria-label={tr(`Comentar sobre ${label}`, `Comment on ${label}`)} onClick={() => setOpen(true)}>
          <Icon name="plus" size={14} stroke={2.2} />
          {tr('Comentar', 'Comment')}
        </button>
      ) : (
        <div id={boxId} className={styles.commentBox}>
          <label htmlFor={`${boxId}-t`} className="sr-only">
            {tr(`Comentário sobre ${label}`, `Comment on ${label}`)}
          </label>
          <textarea
            id={`${boxId}-t`}
            className={`textarea ${invalid ? styles.textBlocked : ''}`}
            rows={2}
            maxLength={PARAM_COMMENT_MAX}
            value={comment}
            placeholder={tr('O que acontece, sem nomes', 'What happens, no names')}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${boxId}-erro` : undefined}
            autoFocus={!comment}
            onChange={(e) => onComment(k, e.target.value)}
          />
          <div className={`row between small muted ${styles.commentFoot}`}>
            <span id={`${boxId}-erro`} className={invalid ? styles.commentError : ''}>
              {invalid ? tr('Sem nomes nem insultos', 'No names or insults') : ''}
            </span>
            <span className="mono">
              {comment.length}/{PARAM_COMMENT_MAX}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface ScoreRowProps<K extends ParamKey> extends CommentProps<K> {
  k: K;
  value: number;
  /** Recebe a chave: a mesma função serve todas as linhas (estável, para o memo) */
  onPick: (k: K, n: number) => void;
  /** parâmetro acrescentado pela pessoa: pode tirá-lo */
  onRemove?: (k: K) => void;
  desktop?: boolean;
}

/** Botão para tirar um parâmetro acrescentado */
function RemoveParam<K extends ParamKey>({ k, label, onRemove }: { k: K; label: string; onRemove?: (k: K) => void }) {
  if (!onRemove) return null;
  return (
    <button type="button" className={`link ${styles.removeParam}`} aria-label={tr(`Tirar ${label}`, `Remove ${label}`)} onClick={() => onRemove(k)}>
      {tr('Tirar', 'Remove')}
    </button>
  );
}

/**
 * Um critério (ou parâmetro com escala) com um slider de 1 a 5 (21/10; antes cinco botões). A cor intensifica-se com a nota
 * e a etiqueta diz o que ela quer dizer (Péssimo … Excelente). Sem nota, o slider fica cinzento: tocar ou usar as setas dá a nota;
 * o × (ou Delete) tira-a.
 * memo: ao dar uma nota só a linha desse critério volta a correr (medido com scripts/react-profile.mjs).
 */
function ScoreRowImpl<K extends ParamKey>({ k, value, onPick, desktop = false, comment, onComment, invalid, onRemove }: ScoreRowProps<K>) {
  const c = paramMeta(k);
  const nameId = `nota-${k}`;
  const word = scoreWord(value);
  const level = value || undefined;
  // sem nota o slider está no meio: tocar aí não muda o valor (não há onChange), por isso a nota dá-se ao largar
  const pickCurrent = (e: { currentTarget: HTMLInputElement }) => {
    if (!value) onPick(k, Number(e.currentTarget.value));
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && value) {
      e.preventDefault();
      onPick(k, 0);
    }
  };
  return (
    <div className={desktop ? styles.scoreWide : styles.score} data-respect={k === 'respeito' || undefined} data-level={level}>
      <div className={`row ${styles.scoreHead}`}>
        <span className={`row ${styles.scoreName}`}>
          <span id={nameId} className={styles.scoreLabel}>
            {c.label}
          </span>
          <HelpTip id={nameId} label={c.label} text={c.help} />
        </span>
        <span className={styles.levelPill} data-level={level} aria-hidden="true">
          {value ? `${value} · ${word}` : word}
        </span>
      </div>
      <div className={`row ${styles.sliderRow}`}>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          className={styles.slider}
          value={value || 3}
          data-empty={!value || undefined}
          style={{ '--pct': `${((value || 1) - 1) * 25}%` } as CSSProperties}
          aria-labelledby={nameId}
          aria-valuetext={value ? tr(`${value} de 5, ${word}`, `${value} of 5, ${word}`) : tr('Sem nota', 'No score')}
          onChange={(e) => onPick(k, Number(e.target.value))}
          onPointerUp={pickCurrent}
          onKeyDown={onKey}
        />
        <button type="button" className={styles.clear} aria-label={tr(`Tirar a nota de ${c.label}`, `Remove the ${c.label} score`)} onClick={() => onPick(k, 0)} hidden={!value}>
          <Icon name="close" size={14} stroke={2.2} />
        </button>
      </div>
      <span className={`row between mono ${styles.ticks}`} aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </span>
      <div className={`row between ${styles.paramFoot}`}>
        <ParamComment k={k} label={c.label} comment={comment} onComment={onComment} invalid={invalid} />
        <RemoveParam k={k} label={c.label} onRemove={onRemove} />
      </div>
    </div>
  );
}
export const ScoreRow = memo(ScoreRowImpl) as typeof ScoreRowImpl;

interface YesNoRowProps extends CommentProps<ExtraKey> {
  k: ExtraKey;
  value: boolean | undefined;
  onPick: (k: ExtraKey, v: boolean | null) => void;
  onRemove?: (k: ExtraKey) => void;
  desktop?: boolean;
}

/** Parâmetro qualitativo: Sim ou Não (tocar de novo tira a resposta) */
export const YesNoRow = memo(function YesNoRow({ k, value, onPick, desktop = false, comment, onComment, invalid, onRemove }: YesNoRowProps) {
  const p = EXTRA[k];
  const nameId = `nota-${k}`;
  const options = [
    { l: tr('Sim', 'Yes'), v: true },
    { l: tr('Não', 'No'), v: false },
  ];
  return (
    <div className={desktop ? styles.scoreWide : styles.score}>
      <div className={`row ${styles.scoreHead}`}>
        <span className={`row ${styles.scoreName}`}>
          <span id={nameId} className={styles.scoreLabel}>
            {p.label}
          </span>
          <HelpTip id={nameId} label={p.label} text={p.help} />
        </span>
        <div role="group" aria-labelledby={nameId} className={`row ${styles.recommend}`}>
          {options.map((o) => {
            const on = value === o.v;
            return (
              <button key={o.l} type="button" aria-pressed={on} onClick={() => onPick(k, on ? null : o.v)} className={styles.yesNo}>
                {o.l}
              </button>
            );
          })}
        </div>
      </div>
      <div className={`row between ${styles.paramFoot}`}>
        <ParamComment k={k} label={p.label} comment={comment} onComment={onComment} invalid={invalid} />
        <RemoveParam k={k} label={p.label} onRemove={onRemove} />
      </div>
    </div>
  );
});

/** "Acrescentar parâmetro": os que faltam, da lista do tipo de trabalho */
export function AddParams({ available, onAdd }: { available: ExtraKey[]; onAdd: (k: ExtraKey) => void }) {
  const [open, setOpen] = useState(false);
  if (!available.length) return null;
  return (
    <div className={styles.addParams}>
      <button type="button" className={`btn btn-ghost ${styles.addToggle}`} aria-expanded={open} aria-controls="mais-parametros" onClick={() => setOpen(!open)}>
        <Icon name="plus" size={16} stroke={2.2} />
        {tr('Acrescentar parâmetro', 'Add a parameter')}
      </button>
      {open && (
        <div id="mais-parametros" role="group" aria-label={tr('Parâmetros que podes acrescentar', 'Parameters you can add')} className={`row wrap ${styles.tags}`}>
          {available.map((k) => (
            <button key={k} type="button" className={`chip ${styles.tag}`} onClick={() => onAdd(k)}>
              + {EXTRA[k].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Sim / Não de "Recomendavas a um amigo?" (tocar de novo tira; memo: onChange é estável) */
export const RecommendButtons = memo(function RecommendButtons({ value, onChange, desktop = false }: { value: boolean | null; onChange: (v: boolean | null) => void; desktop?: boolean }) {
  const options = [
    { l: tr('Sim', 'Yes'), v: true },
    { l: tr('Não', 'No'), v: false },
  ];
  return (
    <div role="group" aria-label={tr('Recomendavas a um amigo?', 'Would you recommend it to a friend?')} className={`row ${desktop ? styles.recommendWide : styles.recommend}`}>
      {options.map((r) => {
        const on = value === r.v;
        return (
          <button key={r.l} type="button" aria-pressed={on} onClick={() => onChange(on ? null : r.v)} className={styles.yesNo}>
            {r.l}
          </button>
        );
      })}
    </div>
  );
});

interface TagPickerProps {
  tags: string[];
  onToggle: (t: string) => void;
  visible: number;
  badFirst?: boolean;
  desktop?: boolean;
}

/** Etiquetas (as más ficam a roxo quando escolhidas): `visible` + as escolhidas, e um botão +N (memo: não corre a cada tecla do comentário) */
export const TagPicker = memo(function TagPicker({ tags, onToggle, visible, badFirst = false, desktop = false }: TagPickerProps) {
  const [more, setMore] = useState(false);
  const all = tagOrder(badFirst);
  const shown = visibleTags(all, tags, visible, more);
  const hidden = all.length - shown.length;
  return (
    <div role="group" aria-label={tr('O que se destaca?', 'What stands out?')} className={`chips ${desktop ? styles.tagsWide : styles.tags}`}>
      {shown.map((t) => (
        <button key={t} type="button" className={`chip${isBadTag(t) ? ' bad' : ''} ${styles.tag}`} aria-pressed={tags.includes(t)} onClick={() => onToggle(t)}>
          {tagLabel(t)}
        </button>
      ))}
      {(hidden > 0 || more) && (
        <button
          type="button"
          className={`chip ${styles.moreTags}`}
          aria-expanded={more}
          aria-label={more ? tr('Mostrar menos etiquetas', 'Show fewer tags') : tr(`Ver mais ${hidden} etiquetas`, `Show ${hidden} more tags`)}
          onClick={() => setMore(!more)}
        >
          {more ? tr('Menos', 'Less') : `+${hidden}`}
        </button>
      )}
    </div>
  );
});

/** Grelha das 8 notas (bolinhas) */
export function NotesGrid({ scores, desktop = false }: { scores: Partial<Scores>; desktop?: boolean }) {
  return (
    <div className={`fade-up ${desktop ? styles.notesWide : styles.notes}`}>
      {MOBILE_ORDER.map((k) => {
        const v = scoreOf(scores, k);
        return (
          <div key={k} className={styles.note}>
            <span className={styles.noteName}>{CRITERION[k].short}</span>
            <span className={`row ${styles.noteValue}`}>
              <Dots value={v} color={CRITERION[k].color} size={desktop ? 13 : 12} gap={desktop ? 4 : 3} />
              <span className={`mono ${styles.noteNumber}`}>{v ? fmt(v) : '—'}</span>
              <span className="sr-only">
                {CRITERION[k].label}: {v ? tr(`${v} de 5`, `${v} of 5`) : tr('sem nota', 'no score')}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Linha com cadeado (ex.: "Publicação anónima"); memo: o texto é sempre o mesmo */
export const LockLine = memo(function LockLine({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <span className={`row small muted ${styles.lock}`} data-center={center || undefined}>
      <Icon name="lock" size={14} />
      {children}
    </span>
  );
});
