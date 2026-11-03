import { ANONYMOUS_GROUNDS, LEGAL_GROUNDS, NOTICE_MAX_EXPLANATION, NOTICE_MIN_EXPLANATION, type LegalGround, type NoticeField } from '@peekjob/shared';
import { useId } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { REPORT_REASONS } from '../../data/content';
import { tr } from '../../i18n';
import { decisionChannel, MAX_DETAIL, type ReportTarget } from './report';
import type { ReportState } from './useReport';
import styles from './Report.module.css';

/** Motivos (rádio): cartões no computador, lista no telemóvel */
export function ReasonPicker({ r, desktop }: { r: ReportState; desktop: boolean }) {
  return (
    <div className={styles.reasonBlock}>
      <div role="radiogroup" aria-label={tr('Motivo', 'Reason')} aria-describedby={r.missingReason ? 'reason-err' : undefined} className={desktop ? styles.reasonGrid : styles.reasonList}>
        {REPORT_REASONS.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={r.reason === x.id} onClick={() => r.setReason(x.id)} className={`row ${desktop ? styles.reasonCard : styles.reasonRow}`}>
            {desktop ? (
              <span aria-hidden="true" className={styles.radio} />
            ) : (
              <span aria-hidden="true" className={styles.radioRing}>
                <span className={styles.radioDot} />
              </span>
            )}
            <span className={styles.reasonText}>
              <span>{x.label}</span>
              {x.hint && <span className={`small muted ${styles.hint}`}>{x.hint}</span>}
            </span>
          </button>
        ))}
      </div>
      {r.missingReason && (
        <span id="reason-err" role="alert" className={`small ${styles.error}`}>
          {tr('Escolhe um motivo para enviar.', 'Choose a reason to send.')}
        </span>
      )}
    </div>
  );
}

export function DetailBox({ r, id }: { r: ReportState; id: string }) {
  return (
    <textarea
      id={id}
      className={`textarea ${styles.textarea}`}
      rows={3}
      maxLength={MAX_DETAIL}
      value={r.detail}
      onChange={(e) => r.setDetail(e.target.value)}
      placeholder={tr('Sem nomes nem dados pessoais, por favor.', 'No names or personal details, please.')}
    />
  );
}

export const DetailCount = ({ r, live = false }: { r: ReportState; live?: boolean }) => (
  <span className="mono small muted" aria-live={live ? 'polite' : undefined}>
    {r.detail.length}/{MAX_DETAIL}
  </span>
);

/** Sem conta: contacto opcional para receber a decisão (na notificação de conteúdo ilegal vai no formulário próprio) */
export function ContactFields({ r }: { r: ReportState }) {
  if (!r.anonymous || r.illegal) return null;
  return (
    <fieldset className={styles.contact}>
      <legend className={`small ${styles.contactLegend}`}>{tr('Queres saber a decisão? (opcional)', 'Want to know the decision? (optional)')}</legend>
      <input className="input" type="text" autoComplete="name" placeholder={tr('Nome', 'Name')} value={r.contactName} onChange={(e) => r.setContactName(e.target.value)} />
      <input className="input" type="email" autoComplete="email" placeholder={tr('Email', 'Email')} value={r.contactEmail} onChange={(e) => r.setContactEmail(e.target.value)} />
      <span className="small muted">{tr('Só usamos o email para te dizer a decisão e apagamo-lo a seguir.', 'We only use it to tell you the decision, then delete it.')}</span>
    </fieldset>
  );
}

const noticeErrors = (): Record<NoticeField, string> => ({
  legalGround: tr('Escolhe a lei ou o direito que achas que é violado.', 'Choose the law or right you think is breached.'),
  explanation: tr(
    `Explica com factos concretos porque é ilegal (pelo menos ${NOTICE_MIN_EXPLANATION} caracteres).`,
    `Explain with concrete facts why it is illegal (at least ${NOTICE_MIN_EXPLANATION} characters).`,
  ),
  contactName: tr('Escreve o teu nome.', 'Write your name.'),
  contactEmail: tr('Escreve um email válido.', 'Write a valid email.'),
  goodFaith: tr('Confirma a declaração de boa-fé.', 'Confirm the good-faith statement.'),
});

function FieldError({ r, field, id }: { r: ReportState; field: NoticeField; id: string }) {
  if (!r.missing(field)) return null;
  return (
    <span id={id} role="alert" className={`small ${styles.error}`}>
      {noticeErrors()[field]}
    </span>
  );
}

/**
 * Notificação de conteúdo ilegal (Regulamento dos Serviços Digitais, art. 16.º, n.º 2): fundamento e explicação (a),
 * endereço exato do conteúdo (b), nome e email (c, exceto abuso sexual de crianças) e declaração de boa-fé (d).
 */
export function IllegalNoticeFields({ r }: { r: ReportState }) {
  const id = useId();
  const f = (name: NoticeField | 'url') => `${id}-${name}`;
  const err = (name: NoticeField) => (r.missing(name) ? `${f(name)}-err` : undefined);
  const lang = tr('pt', 'en');
  const anonymousOk = ANONYMOUS_GROUNDS.includes(r.legalGround as LegalGround);
  const optional = anonymousOk ? <span className={styles.optional}> {tr('(opcional)', '(optional)')}</span> : null;
  return (
    <fieldset className={styles.notice}>
      <legend className={`small ${styles.contactLegend}`}>{tr('Notificação de conteúdo ilegal', 'Notice of illegal content')}</legend>
      <span className="small muted">
        {tr(
          'Ao abrigo do Regulamento dos Serviços Digitais (art. 16.º). Uma pessoa analisa e responde-te com a decisão e o motivo.',
          'Under the Digital Services Act (Article 16). A person reviews it and replies with the decision and the reason.',
        )}
      </span>

      <label htmlFor={f('legalGround')} className={styles.detailLabel}>
        {tr('Que lei é violada?', 'Which law is breached?')}
      </label>
      <select
        id={f('legalGround')}
        className={`input ${styles.select}`}
        value={r.legalGround}
        required
        aria-invalid={r.missing('legalGround') || undefined}
        aria-describedby={err('legalGround')}
        onChange={(e) => r.setLegalGround(e.target.value)}
      >
        <option value="">{tr('Escolhe…', 'Choose…')}</option>
        {LEGAL_GROUNDS.map((g) => (
          <option key={g.id} value={g.id}>
            {lang === 'en' ? g.en : g.pt}
          </option>
        ))}
      </select>
      <FieldError r={r} field="legalGround" id={`${f('legalGround')}-err`} />

      <div className={`row between ${styles.baseline}`}>
        <label htmlFor={f('explanation')} className={styles.detailLabel}>
          {tr('Porque é ilegal?', 'Why is it illegal?')}
        </label>
        <span className="mono small muted">
          {r.detail.length}/{NOTICE_MAX_EXPLANATION}
        </span>
      </div>
      <textarea
        id={f('explanation')}
        className={`textarea ${styles.textarea}`}
        rows={4}
        maxLength={NOTICE_MAX_EXPLANATION}
        required
        value={r.detail}
        aria-invalid={r.missing('explanation') || undefined}
        aria-describedby={err('explanation')}
        onChange={(e) => r.setDetail(e.target.value)}
        placeholder={tr('Que factos são falsos ou que direito é violado, e porquê.', 'Which facts are false or which right is breached, and why.')}
      />
      <FieldError r={r} field="explanation" id={`${f('explanation')}-err`} />

      <label htmlFor={f('url')} className={styles.detailLabel}>
        {tr('Endereço do conteúdo', 'Content address')}
      </label>
      <input id={f('url')} className="input mono small" type="text" readOnly value={window.location.href} />

      <label htmlFor={f('contactName')} className={styles.detailLabel}>
        {tr('Nome', 'Name')}
        {optional}
      </label>
      <input
        id={f('contactName')}
        className="input"
        type="text"
        autoComplete="name"
        required={!anonymousOk}
        value={r.contactName}
        aria-invalid={r.missing('contactName') || undefined}
        aria-describedby={err('contactName')}
        onChange={(e) => r.setContactName(e.target.value)}
      />
      <FieldError r={r} field="contactName" id={`${f('contactName')}-err`} />
      <label htmlFor={f('contactEmail')} className={styles.detailLabel}>
        {tr('Email', 'Email')}
        {optional}
      </label>
      <input
        id={f('contactEmail')}
        className="input"
        type="email"
        autoComplete="email"
        required={!anonymousOk}
        value={r.contactEmail}
        aria-invalid={r.missing('contactEmail') || undefined}
        aria-describedby={err('contactEmail')}
        onChange={(e) => r.setContactEmail(e.target.value)}
      />
      <FieldError r={r} field="contactEmail" id={`${f('contactEmail')}-err`} />
      <span className="small muted">
        {tr(
          'Usamos o nome e o email só para confirmar a receção e dizer-te a decisão. Não os mostramos a quem escreveu.',
          'We only use your name and email to confirm receipt and tell you the decision. We don’t show them to the author.',
        )}
      </span>

      <label className={`row ${styles.goodFaith}`}>
        <input
          type="checkbox"
          checked={r.goodFaith}
          aria-invalid={r.missing('goodFaith') || undefined}
          aria-describedby={err('goodFaith')}
          onChange={(e) => r.setGoodFaith(e.target.checked)}
          className={styles.checkbox}
        />
        <span>
          {tr(
            'Declaro de boa-fé que a informação e as alegações desta notificação são exatas e completas.',
            'I declare in good faith that the information and allegations in this notice are accurate and complete.',
          )}
        </span>
      </label>
      <FieldError r={r} field="goodFaith" id={`${f('goodFaith')}-err`} />
    </fieldset>
  );
}

export function SendError({ r }: { r: ReportState }) {
  if (!r.error) return null;
  return (
    <span role="alert" className={`small ${styles.error}`}>
      {r.error}
    </span>
  );
}

/** Situações ilegais têm entidades próprias */
export function IllegalSupport() {
  return (
    <section aria-labelledby="ilegal-h" className={`card purple ${styles.illegal}`}>
      <h2 id="ilegal-h" className={`h2 ${styles.illegalTitle}`}>
        {tr('Viveste algo ilegal no trabalho?', 'Did something illegal happen to you at work?')}
      </h2>
      <p className={styles.illegalText}>
        {tr(
          'Salários em atraso, assédio ou discriminação têm entidades próprias: a ACT, a CITE e a APAV podem ajudar. A PeekJob não apresenta queixas.',
          'Late pay, harassment and discrimination have their own bodies: ACT, CITE and APAV can help. PeekJob doesn’t file complaints.',
        )}
      </p>
      <Link to="/apoio" className={`btn btn-purple lift ${styles.illegalButton}`}>
        {tr('Ver onde pedir apoio', 'See where to get support')}
      </Link>
      <span className={`small ${styles.purple}`}>{tr('Em perigo imediato, liga 112.', 'In immediate danger, call 112.')}</span>
    </section>
  );
}

export function QuotedTarget({ target }: { target: ReportTarget }) {
  return (
    <blockquote className={styles.quote}>
      <span className={styles.quoteTitle}>“{target.title}”</span>
      <span className="small muted">{target.meta}</span>
    </blockquote>
  );
}

/** Denúncia recebida: motivo, prazo, como se sabe a decisão e referência */
export function Confirmation({ r, orgPath, desktop }: { r: ReportState; orgPath: string; desktop: boolean }) {
  const channel = decisionChannel(r.anonymous, r.contactEmail, r.byEmail);
  return (
    <div className={`fade-up ${styles.confirm}`} role="status">
      <span aria-hidden="true" className={styles.check}>
        <span className={styles.checkInner}>
          <Icon name="check" size={desktop ? 28 : 24} stroke={2.4} />
        </span>
      </span>
      <h1 className={`h1 ${styles.confirmTitle}`}>{tr('Recebemos a tua denúncia.', 'We’ve received your report.')}</h1>
      <p className={`body ${styles.confirmText}`}>
        {tr(
          <>
            Motivo: <strong className={styles.reasonStrong}>{r.reasonLabel}</strong>. Uma pessoa revê-a em até 48 horas. {channel}
          </>,
          <>
            Reason: <strong className={styles.reasonStrong}>{r.reasonLabel}</strong>. A person reviews it within 48 hours. {channel}
          </>,
        )}
      </p>
      <span className="mono small muted">
        {tr('Referência', 'Reference')} {r.sent}
      </span>
      <Link to={orgPath} className={`btn btn-dark lift${desktop ? '' : ' btn-block'} ${styles.back}`}>
        {tr('Voltar à organização', 'Back to the organisation')}
      </Link>
    </div>
  );
}

const modSteps = () => [
  { t: tr('Revisão humana', 'Human review'), d: tr('Uma pessoa lê a avaliação e o motivo em até 48 horas.', 'A person reads the review and the reason within 48 hours.') },
  { t: tr('Decisão com regras públicas', 'Decision under public rules'), d: tr('Mantemos, editamos dados pessoais ou retiramos.', 'We keep it, edit out personal details or remove it.') },
  { t: tr('Recebes a resposta', 'You get the answer'), d: tr('Vês a decisão e o motivo nas tuas mensagens.', 'You see the decision and the reason in your messages.') },
];

export function ModSteps() {
  return (
    <ol id="mod-steps" className={`fade-up ${styles.steps}`}>
      {modSteps().map((s, i) => (
        <li key={s.t} className={`row ${styles.step}`}>
          <span aria-hidden="true" className={styles.stepNum}>
            {i + 1}
          </span>
          <span className={styles.stepText}>
            <span className={styles.stepTitle}>{s.t}</span>
            <span className={`small body ${styles.stepBody}`}>{s.d}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** O que se queria denunciar já não existe */
export function ReportNotFound({ orgPath, orgName, desktop }: { orgPath: string; orgName?: string; desktop: boolean }) {
  return (
    <div className={desktop ? 'container dpage' : 'page no-nav'}>
      <div className={styles.notFound}>
        <h1 className="h1">{tr('Não encontrámos o que querias denunciar.', 'We couldn’t find what you wanted to report.')}</h1>
        <p className="lead">
          {tr(
            'Pode já ter sido retirado pela moderação. Se continuares a ver algo errado, volta à página da organização e tenta de novo.',
            'It may already have been removed by moderation. If you still see something wrong, go back to the organisation’s page and try again.',
          )}
        </p>
        <Link to={orgPath} className={`btn btn-dark ${styles.start}`}>
          {orgName ? tr(`Voltar a ${orgName}`, `Back to ${orgName}`) : tr('Ver o ranking', 'See the ranking')}
        </Link>
      </div>
    </div>
  );
}
