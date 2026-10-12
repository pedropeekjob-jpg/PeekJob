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
import { tr } from '../i18n';
import { flagLabel } from '../i18n/labels';
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
    const and = tr(' e ', ' and ');
    const f0 = rf.found.map(flagLabel).join(and);
    const flagLine = f0 ? `${f0.charAt(0).toUpperCase()}${f0.slice(1)}: ${tr('pode ser', 'this may be')} ${rf.kinds.map(flagLabel).join(and)}.` : '';
    const recLabel = draft.recommend === true ? tr('recomendas', 'you recommend it') : draft.recommend === false ? tr('não recomendas', 'you don’t recommend it') : tr('sem resposta', 'no answer');
    const canPublish = !insult && done > 0;
    const toggleTag = (t: string) => updateDraft({ tags: draft.tags.includes(t) ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] });
    const publish = async () => {
      if (!canPublish || busy) return;
      setBusy(true);
      const r = await store.publish();
      setBusy(false);
      if (!r.ok) {
        if (r.status === 422 && r.body?.suggestion) setPubErr({ message: tr('Tira nomes de pessoas e insultos. Descreve a situação.', 'Remove people’s names and insults. Describe the situation.'), suggestion: r.body.suggestion });
        else if (r.status === 409) setPubErr({ message: tr('Já avaliaste esta organização.', 'You’ve already reviewed this organisation.') });
        else if (r.status === 401) setPubErr({ message: tr('Entra para publicar.', 'Sign in to publish.') });
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
                {draft.verified ? <span className="pill pill-match">{tr('Verificado', 'Verified')}</span> : loc && <span className="muted">{loc.label}</span>}
                <span style={{ fontWeight: 600, color: 'var(--teal-text)', paddingLeft: 4 }}>{tr('Mudar', 'Change')}</span>
              </Link>
            }
          />
          <div className="row wrap" style={{ gap: 56, alignItems: 'flex-start', paddingTop: 48 }}>
            <div className="stack" style={{ flex: '1.7 1 600px', minWidth: 0, gap: 32 }}>
              <div className="stack" style={{ gap: 12 }}>
                <h1 style={{ ...DISPLAY, fontSize: 52, lineHeight: 1, letterSpacing: '-0.01em' }}>{tr('Como é trabalhar lá?', 'What’s it like to work there?')}</h1>
                <p className="lead" style={{ fontSize: 16 }}>
                  {tr('De 1 a 5. Deixa em branco o que não sabes.', 'From 1 to 5. Leave blank what you don’t know.')}
                </p>
              </div>

              <section aria-label={tr('Notas por critério', 'Scores by criterion')} className="stack" style={{ background: 'var(--surface)', borderRadius: 28, padding: '12px 28px 20px' }}>
                {DESKTOP_ORDER.map((k) => (
                  <ScoreRow key={k} k={k} desktop value={scoreOf(draft.scores, k)} onPick={(n) => setScore(k, n)} />
                ))}
                <div className="row wrap between" style={{ gap: 12, paddingTop: 16 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{tr('Recomendavas a um amigo?', 'Would you recommend it to a friend?')}</span>
                  <RecommendButtons desktop value={draft.recommend} onChange={(v) => updateDraft({ recommend: v })} />
                </div>
              </section>

              <section aria-labelledby="exp-t" className="stack" style={{ gap: 16 }}>
                <h2 id="exp-t" style={{ ...DISPLAY, fontSize: 24, lineHeight: 1.1 }}>
                  {tr('Conta como é', 'Tell us what it’s like')}
                </h2>
                <TagPicker desktop badFirst visible={3} tags={draft.tags} onToggle={toggleTag} />
                <div className="stack" style={{ gap: 8 }}>
                  <label htmlFor="texto" className="sr-only">
                    {tr('A tua experiência', 'Your experience')}
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
                    <span id="texto-ajuda">{tr('Descreve o que acontece, não quem é. Sem nomes.', 'Describe what happens, not who. No names.')}</span>
                    <span className="mono" style={{ color: text.length > 560 ? 'var(--down)' : undefined }}>{text.length}/600</span>
                  </div>
                </div>
              </section>
            </div>

            <aside aria-label={tr('Pré-visualização', 'Preview')} className="stack" style={{ flex: '1 1 320px', minWidth: 0, position: 'sticky', top: 24, gap: 20 }}>
              <div className="row" style={{ gap: 18 }}>
                <Ring value={avg} size={104} thickness={9} inner="var(--ground)" muted={!done} fontSize={32} ariaLabel={done ? tr(`Nota média ${fmt(avg)} de 5`, `Average score ${fmt(avg)} out of 5`) : tr('Ainda sem notas', 'No scores yet')} />
                <div className="stack" style={{ gap: 4, minWidth: 0 }}>
                  <span style={{ ...DISPLAY, fontSize: 22, lineHeight: 1.1 }}>{tr('A tua nota', 'Your score')}</span>
                  <span className="small muted">
                    {tr(`${done} de 8 notas`, `${done} of 8 scores`)} · {recLabel}
                  </span>
                </div>
              </div>

              {rf.flagged && (
                <section role="status" aria-label={tr('Apoio', 'Support')} className="stack fade-up" style={{ background: 'var(--purple)', color: '#fff', borderRadius: 24, padding: 24, gap: 12 }}>
                  <span style={{ ...DISPLAY, fontSize: 22, lineHeight: 1.15 }}>{tr('Isto pode ser uma ilegalidade', 'This may be against the law')}</span>
                  <span style={{ fontSize: 15, lineHeight: 1.5, color: '#F0E6F7' }}>{flagLine} {tr('A organização não é avisada.', 'The organisation is not told.')}</span>
                  <Link to="/apoio" className="btn lift" style={{ alignSelf: 'flex-start', height: 44, borderRadius: 14, background: '#fff', color: 'var(--purple-text)', fontSize: 15 }}>
                    {tr('Pedir ajuda', 'Get help')}
                  </Link>
                </section>
              )}

              {insult && (
                <section role="alert" className="stack fade-up" style={{ background: 'var(--warn-bg)', borderRadius: 22, padding: 20, gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--warn-text)' }}>{tr('Tira o nome ou insulto antes de publicar', 'Remove the name or insult before publishing')}</span>
                  <span className="small body">{tr('Descreve o que acontece, não quem é.', 'Describe what happens, not who.')}</span>
                  <button type="button" className="btn btn-dark btn-sm lift" style={{ alignSelf: 'flex-start', height: 44 }} onClick={() => updateDraft({ text: softenText(text) })}>
                    {tr('Usar versão sem nome', 'Use version without names')}
                  </button>
                </section>
              )}

              {!rf.flagged && !insult && done > 0 && (
                <div role="status" className="row" style={{ gap: 8, fontSize: 15, color: 'var(--teal-dark)' }}>
                  <Icon name="check" size={18} stroke={2.2} />
                  {tr('Tudo certo para publicar.', 'All set to publish.')}
                </div>
              )}

              {pubErr && (

                <div role="alert" className="card warn" style={{ padding: '12px 16px', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>

                  <span>{pubErr.message}</span>

                  {pubErr.suggestion && (

                    <button type="button" className="link" style={{ padding: 0, minHeight: 32 }} onClick={() => { updateDraft({ text: pubErr.suggestion! }); setPubErr(null); }}>

                      {tr('Usar a versão sugerida', 'Use the suggested version')}

                    </button>

                  )}

                </div>

              )}

              <button type="button" className="btn btn-dark lift" style={{ height: 56 }} disabled={!canPublish || busy} onClick={publish}>
                {insult ? tr('Corrige a frase para publicar', 'Fix the sentence to publish') : done ? tr('Publicar avaliação', 'Publish review') : tr('Dá pelo menos uma nota', 'Give at least one score')}
              </button>
              <LockLine>{tr('Publicada sem o teu nome.', 'Published without your name.')}</LockLine>
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
        <FlowHead icon="close" label={tr('Fechar (o rascunho fica guardado)', 'Close (your draft is saved)')} onClick={() => nav(`/org/${org.id}`)} right={<MiniSteps current={1} />} />
        <div className="stack" style={{ gap: 6 }}>
          <h1 style={{ ...DISPLAY, fontSize: 32, lineHeight: 1.05 }}>{tr('Dá uma nota de 1 a 5', 'Score from 1 to 5')}</h1>
          <div className="small muted">
            {org.name}
            {loc ? ` · ${loc.label.split(' · ').pop()}` : ''} ·{' '}
            <Link to="/avaliar" style={{ fontWeight: 600 }}>
              {tr('Mudar', 'Change')}
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
          <span style={{ fontSize: 15, fontWeight: 600 }}>{tr('Recomendavas a um amigo?', 'Would you recommend it to a friend?')}</span>
          <RecommendButtons value={draft.recommend} onChange={(v) => updateDraft({ recommend: v })} />
        </div>

        <div className="sticky-cta">
          <button type="button" className="btn btn-dark btn-block" style={{ height: 56 }} disabled={!done} onClick={() => nav('/avaliar/texto')}>
            {done ? tr('Continuar', 'Continue') : tr('Dá pelo menos uma nota', 'Give at least one score')}{' '}
            <span className="mono" style={{ fontSize: 13, fontWeight: 500, color: done ? 'var(--grey)' : undefined }}>
              {done}/8
            </span>
          </button>
        </div>
      </div>
    </Shell>
  );
}
