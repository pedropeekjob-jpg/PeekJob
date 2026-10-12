import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Icon } from '../components/Icon';
import { apiMode } from '../api/http';
import { useOrg } from '../api/orgs';
import { useStore } from '../lib/store';
import { detectRedFlags, hasInsultOrName, softenText } from '../lib/moderation';
import { useIsDesktop } from '../lib/useMedia';
import { countDone, DISPLAY, FlowHead, LockLine, MiniSteps, TagPicker } from './Avaliar.parts';

export default function AvaliarTexto() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const store = useStore();
  const { draft, updateDraft } = store;
  const org = useOrg(draft.orgId);
  const [pubErr, setPubErr] = useState<{ message: string; suggestion?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (apiMode && draft.orgId && !org && !store.remote.ready) return null;

  if (!draft.orgId || !org) return <Navigate to="/avaliar" replace />;
  // Em desktop o passo 2 está no mesmo ecrã das notas
  if (desktop) return <Navigate to="/avaliar/notas" replace />;

  const text = draft.text;
  const rf = detectRedFlags(text, draft.tags);
  const insult = hasInsultOrName(text);
  const done = countDone(draft.scores);
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
    <Shell>
      <div className="page no-nav" style={{ minHeight: '100dvh', paddingBottom: 0 }}>
        <FlowHead icon="back" label="Voltar às notas" onClick={() => nav('/avaliar/notas')} right={<MiniSteps current={2} />} />
        <h1 style={{ ...DISPLAY, fontSize: 32, lineHeight: 1.05 }}>Conta como é, em poucas linhas</h1>

        <fieldset className="stack" style={{ border: 0, margin: 0, padding: 0, gap: 10 }}>
          <legend style={{ padding: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--body)' }}>O que se destaca?</legend>
          <TagPicker visible={4} tags={draft.tags} onToggle={toggleTag} />
        </fieldset>

        <div className="stack" style={{ gap: 6 }}>
          <label htmlFor="texto" className="row between" style={{ fontSize: 13, fontWeight: 600, color: 'var(--body)' }}>
            <span>A tua experiência</span>
            <span className="mono muted" style={{ fontWeight: 500, color: text.length > 560 ? 'var(--down)' : undefined }}>
              {text.length}/600
            </span>
          </label>
          <textarea
            id="texto"
            className="textarea"
            rows={5}
            maxLength={600}
            value={text}
            aria-invalid={insult}
            aria-describedby="texto-ajuda"
            placeholder="O que acontece no dia a dia? Sem nomes."
            onChange={(e) => updateDraft({ text: e.target.value.slice(0, 600) })}
            style={{ borderRadius: 16, border: `2px solid ${insult ? '#E3A56B' : rf.flagged ? 'var(--purple)' : 'var(--field)'}`, fontSize: 15, resize: 'none', minHeight: 140 }}
          />
          <span id="texto-ajuda" className="sr-only">
            Descreve o que acontece, não quem é. Sem nomes nem insultos.
          </span>
        </div>

        {rf.flagged && (
          <section role="status" aria-label="Apoio" className="row fade-up" style={{ background: 'var(--purple)', color: '#fff', borderRadius: 22, padding: 16, gap: 14 }}>
            <div className="stack grow" style={{ gap: 4 }}>
              <span style={{ ...DISPLAY, fontSize: 20, lineHeight: 1.15 }}>Isto pode ser uma ilegalidade</span>
              <span style={{ fontSize: 13, lineHeight: 1.4, color: '#F0E6F7' }}>Pode configurar {rf.kinds.join(' e ')}. A organização não é avisada.</span>
            </div>
            <Link to="/apoio" className="btn" style={{ flex: 'none', height: 44, padding: '0 14px', borderRadius: 14, background: '#fff', color: 'var(--purple-text)', fontSize: 15 }}>
              Pedir ajuda
            </Link>
          </section>
        )}

        {insult && (
          <section role="alert" className="stack fade-up" style={{ borderLeft: '3px solid var(--down)', padding: '2px 0 2px 14px', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--warn-text)' }}>Sem nomes nem insultos</div>
            <div className="small body">Descreve o que acontece, não quem é.</div>
            <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', height: 44, borderColor: 'var(--ink)', borderRadius: 12, fontSize: 15 }} onClick={() => updateDraft({ text: softenText(text) })}>
              Usar versão sem nome
            </button>
          </section>
        )}

        {!rf.flagged && !insult && text.trim().length > 0 && (
          <div role="status" className="row" style={{ gap: 8, fontSize: 15, color: 'var(--teal-dark)' }}>
            <Icon name="check" size={18} stroke={2.2} />
            Tudo certo para publicar.
          </div>
        )}

        {done === 0 && (
          <div className="small" style={{ color: 'var(--warn-text)' }}>
            Falta pelo menos uma nota.{' '}
            <Link to="/avaliar/notas" style={{ fontWeight: 600 }}>
              Voltar às notas
            </Link>
          </div>
        )}

        <div className="sticky-cta stack" style={{ gap: 10 }}>
          <LockLine center>Publicação anónima</LockLine>
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
          <button type="button" className="btn btn-primary btn-block" style={{ height: 56 }} disabled={!canPublish || busy} onClick={publish}>
            {insult ? 'Corrige a frase para publicar' : 'Publicar avaliação'}
          </button>
        </div>
      </div>
    </Shell>
  );
}
