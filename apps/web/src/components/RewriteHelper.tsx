import { useEffect, useRef, useState } from 'react';
import { api, apiMode, ApiError } from '../api/http';
import { track } from '../analytics';
import { getLang, tr } from '../i18n';
import { softenText, toneIssues } from '../lib/moderation';
import { Icon } from './Icon';

type Proposal = { text: string; source: 'ai' | 'rules' };

/** Pede uma versão publicável à API (IA com regras de reserva). Na demonstração usa só as regras. */
async function requestRewrite(text: string): Promise<Proposal> {
  const lang = getLang();
  if (!apiMode) {
    await new Promise((r) => setTimeout(r, 500));
    return { text: softenText(text, undefined, lang), source: 'rules' };
  }
  return api<Proposal>('/reviews/rewrite', { body: { text, lang } });
}

/**
 * Reescrever com IA: aparece quando o texto está bloqueado (nomes, insultos) ou tem tom agressivo
 * (gritos, palavrões). Também há uma ligação discreta para textos longos. A pessoa vê a proposta,
 * escolhe usar ou manter o seu texto, e pode sempre editar depois.
 */
export function RewriteHelper({ text, onUse, desktop = false }: { text: string; onUse: (t: string) => void; desktop?: boolean }) {
  const tone = toneIssues(text);
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const forText = useRef('');
  const trigger = tone.blocked ? 'blocked' : tone.aggressive ? 'tone' : 'manual';

  // Se a pessoa continuar a escrever, a proposta deixa de corresponder ao texto
  useEffect(() => {
    if (proposal && text !== forText.current) setProposal(null);
  }, [text, proposal]);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    track('review_rewrite', { step: 'requested', trigger });
    try {
      forText.current = text;
      setProposal(await requestRewrite(text));
    } catch (e) {
      track('review_rewrite', { step: 'failed', trigger });
      setError(
        e instanceof ApiError && e.status === 429
          ? tr('Pediste muitas versões seguidas. Tenta daqui a uns minutos.', 'You’ve asked for a lot of versions in a row. Try again in a few minutes.')
          : tr('Não foi possível reescrever agora. Podes editar o texto à mão.', 'We couldn’t rewrite it right now. You can edit the text yourself.'),
      );
    } finally {
      setBusy(false);
    }
  };
  const accept = () => {
    if (!proposal) return;
    track('review_rewrite', { step: 'accepted', trigger, source: proposal.source });
    onUse(proposal.text);
    setProposal(null);
  };
  const dismiss = () => {
    if (proposal) track('review_rewrite', { step: 'dismissed', trigger, source: proposal.source });
    setProposal(null);
  };

  const button = (
    <button type="button" className={'btn btn-sm lift ' + (desktop ? 'btn-dark' : 'btn-ghost')} data-ev="cta_click" data-ev-cta="rewrite" style={{ alignSelf: 'flex-start', height: 44, borderRadius: 12, fontSize: 15, gap: 8, ...(desktop ? {} : { borderColor: 'var(--ink)' }) }} onClick={run} disabled={busy} aria-busy={busy}>
      <Icon name="sparkle" size={18} />
      {busy ? tr('A reescrever…', 'Rewriting…') : proposal ? tr('Outra versão', 'Another version') : tr('Reescrever com IA', 'Rewrite with AI')}
    </button>
  );

  if (!tone.aggressive && !proposal && !busy && !error) {
    if (text.trim().length < 40) return null;
    return (
      <button type="button" className="link rewrite-link" onClick={run}>
        <Icon name="sparkle" size={16} /> {tr('Rever o tom com IA', 'Check the tone with AI')}
      </button>
    );
  }

  return (
    <section role={tone.blocked ? 'alert' : 'status'} className={'rewrite-box fade-up' + (tone.blocked ? ' is-blocked' : '')} aria-live="polite">
      {tone.aggressive && !proposal && (
        <>
          <strong className="rewrite-title">
            {tone.blocked ? tr('Sem nomes nem insultos', 'No names or insults') : tr('O tom pode afastar quem lê', 'The tone may put readers off')}
          </strong>
          <span className="small body">
            {tone.blocked
              ? tr('Assim não pode ser publicado. A IA propõe uma versão com os mesmos factos, sem nomes nem insultos.', 'This can’t be published as it is. AI can suggest a version with the same facts, without names or insults.')
              : tr('Podes publicar assim. Se quiseres, a IA propõe uma versão mais calma, com os mesmos factos.', 'You can publish it as it is. If you like, AI can suggest a calmer version with the same facts.')}
          </span>
        </>
      )}
      {proposal && (
        <div className="stack" style={{ gap: 10 }}>
          <span className="rewrite-title">{tr('Proposta', 'Suggestion')}</span>
          <blockquote className="rewrite-proposal">{proposal.text}</blockquote>
          <span className="small muted">
            {proposal.source === 'ai'
              ? tr('Escrita por IA a partir do teu texto. Revê antes de publicar: os factos têm de continuar a ser teus.', 'Written by AI from your text. Check it before publishing: the facts must still be yours.')
              : tr('Sugestão automática (sem IA): tira nomes e insultos. Revê a frase antes de publicar.', 'Automatic suggestion (no AI): removes names and insults. Check the sentence before publishing.')}
          </span>
          <div className="row wrap" style={{ gap: 10 }}>
            <button type="button" className="btn btn-primary btn-sm" style={{ height: 44, borderRadius: 12 }} onClick={accept}>
              {tr('Usar esta versão', 'Use this version')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" style={{ height: 44, borderRadius: 12 }} onClick={dismiss}>
              {tr('Manter o meu texto', 'Keep my text')}
            </button>
          </div>
        </div>
      )}
      {error && <span className="small" style={{ color: 'var(--warn-text)' }}>{error}</span>}
      {(!proposal || proposal.source === 'ai') && button}
    </section>
  );
}
