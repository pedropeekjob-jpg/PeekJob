import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Ring } from '../components/Data';
import { Icon } from '../components/Icon';
import type { Org } from '../data/orgs';
import { useOrgs } from '../api/orgs';
import { match } from '../lib/match';
import { fmt, plural } from '../lib/format';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { tr } from '../i18n';

/**
 * Dados de exemplo do POC: organizações cuja mudança da semana vem do critério Respeito e inclusão
 * (em produção viria do histórico de notas por critério).
 */
const RESPEITO_MOVES = new Set(['rede-vizinha']);

/** Nota de mudança desde que guardaste, a partir de weekDelta */
function changeNote(o: Org, short = false): { text: string; color: string; aria?: string } {
  const d = o.weekDelta;
  if (d > 0 && RESPEITO_MOVES.has(o.id) && o.scores.respeito != null) {
    return {
      text: tr(`▲ ${short ? 'Respeito' : 'Respeito e inclusão'} subiu para ${fmt(o.scores.respeito)}`, `▲ ${short ? 'Respect' : 'Respect and inclusion'} up to ${fmt(o.scores.respeito)}`),
      color: 'var(--purple-text)',
      aria: tr(`Respeito e inclusão subiu para ${fmt(o.scores.respeito)}`, `Respect and inclusion up to ${fmt(o.scores.respeito)}`),
    };
  }
  if (d > 0) return { text: tr(`▲ ${fmt(d)} desde que guardaste`, `▲ ${fmt(d)} since you saved it`), color: 'var(--up)', aria: tr(`Subiu ${fmt(d)} desde que guardaste`, `Up ${fmt(d)} since you saved it`) };
  if (d < 0) return { text: tr(`▼ ${fmt(Math.abs(d))} desde que guardaste`, `▼ ${fmt(Math.abs(d))} since you saved it`), color: 'var(--down)', aria: tr(`Desceu ${fmt(Math.abs(d))} desde que guardaste`, `Down ${fmt(Math.abs(d))} since you saved it`) };
  if (o.trend === 'novo') return { text: tr('Nova no ranking', 'New in the ranking'), color: 'var(--body)' };
  return { text: tr('Sem mudanças desde que guardaste', 'No changes since you saved it'), color: 'var(--muted)' };
}

export default function Guardadas() {
  const desktop = useIsDesktop();
  const { saved, toggleSave, prefs } = useStore();
  const orgs = useOrgs();
  const [last, setLast] = useState<{ id: string; name: string } | null>(null);

  const items = saved.map((id) => orgs.find((o) => o.id === id)).filter((o): o is Org => !!o);

  // O aviso de "Desfazer" desaparece sozinho ao fim de uns segundos
  useEffect(() => {
    if (!last) return;
    const t = window.setTimeout(() => setLast(null), 8000);
    return () => window.clearTimeout(t);
  }, [last]);

  const remove = (o: Org) => {
    toggleSave(o.id);
    setLast({ id: o.id, name: o.name });
  };
  const undo = () => {
    if (last && !saved.includes(last.id)) toggleSave(last.id);
    setLast(null);
  };

  const undoBar = last && (
    <div
      className="fade-up row wrap between"
      role="status"
      style={{
        gap: 12, padding: '10px 10px 10px 20px', borderRadius: 18, background: 'var(--ink)', color: '#fff',
        ...(desktop ? { marginTop: 24 } : { position: 'fixed', left: 16, right: 16, bottom: 'calc(var(--nav-h) + 12px)', zIndex: 30, maxWidth: 528, margin: '0 auto' }),
      }}
    >
      <span style={{ fontSize: 15 }}>
        {tr(<>Deixaste de guardar <strong>{last.name}</strong>.</>, <>Removed <strong>{last.name}</strong> from Saved.</>)}
      </span>
      <button type="button" className="btn btn-primary btn-sm" style={{ height: 44 }} onClick={undo}>
        {tr('Desfazer', 'Undo')}
      </button>
    </div>
  );

  const rows = items.map((o) => {
    const n = changeNote(o, !desktop);
    const m = match(o, prefs);
    return (
      <article key={o.id} className="row" style={{ gap: desktop ? 16 : 12, padding: desktop ? '20px 0' : '14px 0', borderBottom: '1px solid var(--line)' }}>
        <Link to={`/org/${o.id}`} data-ev="select_org" data-ev-org-type={o.type} className="plain row grow g-row" style={{ gap: desktop ? 18 : 12 }}>
          <Ring
            value={o.score}
            size={desktop ? 64 : 50}
            fontSize={desktop ? 20 : 15}
            inner="var(--ground)"
            muted={!o.reviewsCount}
          />
          <span className="grow stack" style={{ gap: desktop ? 4 : 3 }}>
            <span className={desktop ? 'num' : 'ellipsis'} style={{ fontSize: desktop ? 20 : 16, fontWeight: 600, lineHeight: 1.15 }}>
              {o.name}
            </span>
            <span className={desktop ? undefined : 'ellipsis'} aria-label={n.aria} style={{ fontSize: 13, fontWeight: 500, color: n.color }}>
              {n.text}
            </span>
          </span>
          {desktop ? (
            <span className="pill pill-match" style={{ fontSize: 13, padding: '5px 11px' }}>
              {tr(`${m}% para ti`, `${m}% for you`)}
            </span>
          ) : (
            <span className="stack" style={{ flex: 'none', alignItems: 'flex-end', color: 'var(--teal-dark)', lineHeight: 1.15 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{m}%</span>
              <span style={{ fontSize: 13 }}>{tr('para ti', 'for you')}</span>
            </span>
          )}
        </Link>
        <button type="button" className="icon-btn bare" aria-label={tr(`Deixar de guardar ${o.name}`, `Remove ${o.name} from Saved`)} title={tr('Deixar de guardar', 'Remove from Saved')} onClick={() => remove(o)}>
          <Icon name="bookmark" size={18} filled />
        </button>
      </article>
    );
  });

  if (desktop) {
    return (
      <Shell nav>
        <div className="container" style={{ paddingBottom: 64 }}>
          <div className="row wrap between" style={{ alignItems: 'flex-end', gap: 24, paddingTop: 48 }}>
            <div className="stack" style={{ gap: 12 }}>
              <h1 className="h1" style={{ fontSize: 56, lineHeight: 1 }}>
                {tr('Guardadas', 'Saved')}
              </h1>
              <p className="lead" style={{ fontSize: 16 }}>
                {plural(items.length, tr('organização', 'organisation'), tr('organizações', 'organisations'))} · {tr('avisamos-te quando algo muda.', 'we’ll let you know when something changes.')}
              </p>
            </div>
            <Link to="/ranking" className="btn btn-dark">
              {tr('Descobrir mais', 'Discover more')} <Icon name="next" size={18} />
            </Link>
          </div>
          {undoBar}
          {items.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(480px, 100%), 1fr))', columnGap: 64, paddingTop: 32 }}>{rows}</div>
          ) : (
            <div className="fade-up row wrap" style={{ gap: 40, padding: '48px 0' }}>
              <div aria-hidden="true" style={{ position: 'relative', width: 120, height: 120, flex: 'none' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '12px solid var(--teal-tint)' }} />
                <div style={{ position: 'absolute', inset: 28, borderRadius: '50%', border: '8px solid var(--teal)' }} />
              </div>
              <div className="stack" style={{ flex: '1 1 320px', gap: 12 }}>
                <h2 className="h2" style={{ fontSize: 24 }}>
                  {tr('Ainda não guardaste nenhuma organização', 'You haven’t saved any organisations yet')}
                </h2>
                <p className="lead" style={{ fontSize: 16 }}>
                  {tr('Carrega em Guardar na página de uma organização.', 'Click Save on an organisation’s page.')}
                </p>
                <Link to="/ranking" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 8, height: 54 }}>
                  {tr('Ver o ranking', 'View the ranking')}
                </Link>
              </div>
            </div>
          )}
        </div>
        <style>{`.g-row{transition:opacity .15s}.g-row:hover .num{text-decoration:underline}`}</style>
      </Shell>
    );
  }

  return (
    <Shell nav>
      <div className="page" style={{ paddingTop: 28 }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="h1" style={{ fontSize: 36, lineHeight: 1 }}>
            {tr('Guardadas', 'Saved')}
          </h1>
          <div className="small muted">
            {items.length > 0 ? `${plural(items.length, tr('organização', 'organisation'), tr('organizações', 'organisations'))} · ` : ''}{tr('Avisamos-te quando algo muda.', 'We’ll let you know when something changes.')}
          </div>
        </div>
        <div className="stack">
          {rows}
          {items.length === 0 && (
            <div className="fade-up stack" style={{ padding: '24px 0', gap: 6 }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{tr('Ainda não guardaste nenhuma', 'You haven’t saved any yet')}</div>
              <div className="small muted">{tr('Toca em Guardar na página de uma organização.', 'Tap Save on an organisation’s page.')}</div>
              <Link to="/ranking" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 14 }}>
                {tr('Ver o ranking', 'View the ranking')}
              </Link>
            </div>
          )}
        </div>
        {items.length > 0 && (
          <Link to="/ranking" className="link" style={{ alignSelf: 'flex-start', fontSize: 15 }}>
            {tr('Descobrir mais organizações', 'Discover more organisations')} <Icon name="next" size={16} />
          </Link>
        )}
      </div>
      {undoBar}
    </Shell>
  );
}
