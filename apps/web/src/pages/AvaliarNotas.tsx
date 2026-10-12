import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Icon } from '../components/Icon';
import { Ring } from '../components/Data';
import { apiMode } from '../api/http';
import { useOrg } from '../api/orgs';
import type { CriterionKey } from '../data/criteria';
import { avgOf, useStore } from '../lib/store';
import { detectRedFlags, hasInsultOrName, softenText } from '../lib/moderation';
import { fmt } from '../lib/format';
import { useIsDesktop } from '../lib/useMedia';
import { countDone, DeskSteps, DESKTOP_ORDER, DISPLAY, FlowHead, LockLine, MiniSteps, MOBILE_ORDER, RecommendButtons, ScoreRow, scoreOf, TagPicker } from './Avaliar.parts';

export default function AvaliarNotas() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const store = useStore();
  const { draft, updateDraft } = store;
  const org = useOrg(draft.orgId);
  const [pubErr, setPubErr] = useState<{ message: string; suggestion?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState<CriterionKey | null>(null);
  if (apiMode && draft.orgId && !org && !store.remote.ready) return null;

  // Ao publicar o rascunho é limpo antes de ir para "publicado": não voltar a /avaliar pelo meio
  if (!draft.orgId || !org) return busy ? null : <Navigate to="/avaliar" replace />;

  const loc = org.locations.find((l) => l.id === draft.locationId);
  const done = countDone(draft.scores);
  const setScore = (k: CriterionKey, n: number) => {
    const s = { ...draft.scores };
    if (n) s[k] = n;
    else delete s[k];
    updateDraft({ scores: s });
  };

  /* ---------- Desktop: tudo num ecrã ---------- */
  if (desktop) {
    const text = draft.text;
    const rf = detectRedFlags(text, draft.tags);
    const insult = hasInsultOrName(text);
    const avg = avgOf(draft.scores);
    const f0 = rf.found.join(' e ');
    const flagLine = f0 ? `${f0.charAt(0).toUpperCase()}${f0.slice(1)}: pode ser ${rf.kinds.join(' e ')}.` : '';
    const recLabel = draft.recommend === true ? 'recomendas' : draft.recommend === false ? 'não recomendas' : 'sem resposta';
    const canPublish = !insult && done > 0;
    const toggleTag = (t: string) => updateDraft({ tags: draft.tags.includes(t) ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] });
    const publish = async () => {
      if (!canPublish || busy) return;
      setBusy(true);
      const r = await store.publish();
      setBusy(false);
      if (!r.ok) {
        if (r.status === 422 && r.body?.suggestion) setPubErr({ message: 'Tira nomes de pessoas e insultos. Descreve a situação.', suggestion: r.body.suggestion });
        else if (r.status === 409) setPubErr({ message: 'Já avaliaste esta organização.' });
        else if (r.status === 401) setPubErr({ message: 'Entra para publicar.' });
        else setPubErr({ message: r.message });
        return;
      }
      nav('/avaliar/feito');
    };

    return (
      <Shell chrome="header">
        <div className="container" style={{ paddingBottom: 80 }}>
          <DeskSteps
            current={3}
            right={
              <Link to="/avaliar" className="plain row" style={{ minHeight: 44, gap: 10, fontSize: 15 }}>
                <span style={{ fontWeight: 600 }}>{org.name}</span>
                {draft.verified ? <span className="pill pill-match">Verificado</span> : loc && <span className="muted">{loc.label}</span>}
                <span style={{ fontWeight: 600, color: 'var(--teal-text)', paddingLeft: 4 }}>Mudar</span>
              </Link>
            }
          />
          <div className="row wrap" style={{ gap: 56, alignItems: 'flex-start', paddingTop: 48 }}>
            <div className="stack" style={{ flex: '1.7 1 600px', minWidth: 0, gap: 32 }}>
              <div className="stack" style={{ gap: 12 }}>
                <h1 style={{ ...DISPLAY, fontSize: 52, lineHeight: 1, letterSpacing: '-0.01em' }}>Como é trabalhar lá?</h1>
                <p className="lead" style={{ fontSize: 16 }}>
                  De 1 a 5. Deixa em branco o que não sabes.
                </p>
              </div>

              <section aria-label="Notas por critério" className="stack" style={{ background: 'var(--surface)', borderRadius: 28, padding: '12px 28px 20px' }}>
                {DESKTOP_ORDER.map((k) => (
                  <ScoreRow key={k} k={k} desktop value={scoreOf(draft.scores, k)} onPick={(n) => setScore(k, n)} />
                ))}
                <div className="row wrap between" style={{ gap: 12, paddingTop: 16 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Recomendavas a um amigo?</span>
                  <RecommendButtons desktop value={draft.recommend} onChange={(v) => updateDraft({ recommend: v })} />
                </div>
              </section>

              <section aria-labelledby="exp-t" className="stack" style={{ gap: 16 }}>
                <h2 id="exp-t" style={{ ...DISPLAY, fontSize: 24, lineHeight: 1.1 }}>
                  Conta como é
                </h2>
                <TagPicker desktop badFirst visible={3} tags={draft.tags} onToggle={toggleTag} />
                <div className="stack" style={{ gap: 8 }}>
                  <label htmlFor="texto" className="sr-only">
                    A tua experiência
                  </label>
                  <textarea
                    id="texto"
                    className="textarea"
                    rows={4}
                    maxLength={600}
                    value={text}
                    aria-describedby="texto-ajuda"
                    aria-invalid={insult}
                    onChange={(e) => updateDraft({ text: e.target.value.slice(0, 600) })}
                    style={{ borderRadius: 18, border: `2px solid ${insult ? '#E3A56B' : rf.flagged ? 'var(--purple)' : 'var(--field)'}`, fontSize: 16, lineHeight: 1.55 }}
                  />
                  <div className="row between small muted" style={{ gap: 12 }}>
                    <span id="texto-ajuda">Descreve o que acontece, não quem é. Sem nomes.</span>
                    <span className="mono" style={{ color: text.length > 560 ? 'var(--down)' : undefined }}>{text.length}/600</span>
                  </div>
                </div>
              </section>
            </div>

            <aside aria-label="Pré-visualização" className="stack" style={{ flex: '1 1 320px', minWidth: 0, position: 'sticky', top: 24, gap: 20 }}>
              <div className="row" style={{ gap: 18 }}>
                <Ring value={avg} size={104} thickness={9} inner="var(--ground)" muted={!done} fontSize={32} ariaLabel={done ? `Nota média ${fmt(avg)} de 5` : 'Ainda sem notas'} />
                <div className="stack" style={{ gap: 4, minWidth: 0 }}>
                  <span style={{ ...DISPLAY, fontSize: 22, lineHeight: 1.1 }}>A tua nota</span>
                  <span className="small muted">
                    {done} de 8 notas · {recLabel}
                  </span>
                </div>
              </div>

              {rf.flagged && (
                <section role="status" aria-label="Apoio" className="stack fade-up" style={{ background: 'var(--purple)', color: '#fff', borderRadius: 24, padding: 24, gap: 12 }}>
                  <span style={{ ...DISPLAY, fontSize: 22, lineHeight: 1.15 }}>Isto pode ser uma ilegalidade</span>
                  <span style={{ fontSize: 15, lineHeight: 1.5, color: '#F0E6F7' }}>{flagLine} A organização não é avisada.</span>
                  <Link to="/apoio" className="btn lift" style={{ alignSelf: 'flex-start', height: 44, borderRadius: 14, background: '#fff', color: 'var(--purple-text)', fontSize: 15 }}>
                    Pedir ajuda
                  </Link>
                </section>
              )}

              {insult && (
                <section role="alert" className="stack fade-up" style={{ background: 'var(--warn-bg)', borderRadius: 22, padding: 20, gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--warn-text)' }}>Tira o nome ou insulto antes de publicar</span>
                  <span className="small body">Descreve o que acontece, não quem é.</span>
                  <button type="button" className="btn btn-dark btn-sm lift" style={{ alignSelf: 'flex-start', height: 44 }} onClick={() => updateDraft({ text: softenText(text) })}>
                    Usar versão sem nome
                  </button>
                </section>
              )}

              {!rf.flagged && !insult && done > 0 && (
                <div role="status" className="row" style={{ gap: 8, fontSize: 15, color: 'var(--teal-dark)' }}>
                  <Icon name="check" size={18} stroke={2.2} />
                  Tudo certo para publicar.
                </div>
              )}

              {pubErr && (

                <div role="alert" className="card warn" style={{ padding: '12px 16px', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>

                  <span>{pubErr.message}</span>

                  {pubErr.suggestion && (

                    <button type="button" className="link" style={{ padding: 0, minHeight: 32 }} onClick={() => { updateDraft({ text: pubErr.suggestion! }); setPubErr(null); }}>

                      Usar a versão sugerida

                    </button>

                  )}

                </div>

              )}

              <button type="button" className="btn btn-dark lift" style={{ height: 56 }} disabled={!canPublish || busy} onClick={publish}>
                {insult ? 'Corrige a frase para publicar' : done ? 'Publicar avaliação' : 'Dá pelo menos uma nota'}
              </button>
              <LockLine>Publicada sem o teu nome.</LockLine>
            </aside>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- Mobile: passo 1/3 ---------- */
  return (
    <Shell>
      <div className="page no-nav" style={{ minHeight: '100dvh', paddingBottom: 0, gap: 20 }}>
        <FlowHead icon="close" label="Fechar (o rascunho fica guardado)" onClick={() => nav(`/org/${org.id}`)} right={<MiniSteps current={1} />} />
        <div className="stack" style={{ gap: 6 }}>
          <h1 style={{ ...DISPLAY, fontSize: 32, lineHeight: 1.05 }}>Dá uma nota de 1 a 5</h1>
          <div className="small muted">
            {org.name}
            {loc ? ` · ${loc.label.split(' · ').pop()}` : ''} ·{' '}
            <Link to="/avaliar" style={{ fontWeight: 600 }}>
              Mudar
            </Link>
          </div>
        </div>

        <div className="stack">
          {MOBILE_ORDER.map((k) => (
            <ScoreRow
              key={k}
              k={k}
              value={scoreOf(draft.scores, k)}
              onPick={(n) => setScore(k, n)}
              help={{ open: help === k, toggle: () => setHelp(help === k ? null : k) }}
            />
          ))}
        </div>

        <div className="row between" style={{ gap: 12, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Recomendavas a um amigo?</span>
          <RecommendButtons value={draft.recommend} onChange={(v) => updateDraft({ recommend: v })} />
        </div>

        <div className="sticky-cta">
          <button type="button" className="btn btn-dark btn-block" style={{ height: 56 }} disabled={!done} onClick={() => nav('/avaliar/texto')}>
            {done ? 'Continuar' : 'Dá pelo menos uma nota'}{' '}
            <span className="mono" style={{ fontSize: 13, fontWeight: 500, color: done ? 'var(--grey)' : undefined }}>
              {done}/8
            </span>
          </button>
        </div>
      </div>
    </Shell>
  );
}
