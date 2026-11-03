import { noticeProblems, type NoticeField } from '@peekjob/shared';
import { useState } from 'react';
import { apiMode } from '../../api/http';
import { REPORT_REASONS } from '../../data/content';
import { useStore } from '../../lib/store';
import { demoReference, reportErrorText, type ReportTarget } from './report';

/** Estado e envio de uma denúncia (modo API: servidor; demonstração: referência local) */
export function useReport(orgId: string | undefined, itemId: string | undefined, kind: ReportTarget['kind'] = 'avaliação') {
  const { user, reportContent } = useStore();
  /** sem conta (modo API): pode deixar contacto para saber a decisão (Regulamento dos Serviços Digitais) */
  const anonymous = apiMode && !user;
  const [reason, setReasonState] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  /** notificação de conteúdo ilegal (art. 16.º): fundamento e declaração de boa-fé */
  const [legalGround, setLegalGround] = useState('');
  const [goodFaith, setGoodFaith] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<string | null>(null);

  const illegal = reason === 'ilegal';
  const problems: NoticeField[] = illegal ? noticeProblems({ legalGround, explanation: detail, contactName, contactEmail, goodFaith }) : [];
  /** contacto pedido: sempre na notificação de conteúdo ilegal; nas outras, só sem conta (opcional) */
  const withContact = illegal || anonymous;

  const setReason = (id: string) => {
    setReasonState(id);
    setTried(false);
  };

  const send = async () => {
    if (!reason || problems.length) {
      setTried(true);
      return;
    }
    if (busy) return;
    if (apiMode && itemId) {
      setBusy(true);
      setError('');
      const r = await reportContent(kind === 'entrevista' ? 'interview' : 'review', itemId, {
        reason,
        details: detail.trim(),
        contactName: withContact && contactName.trim() ? contactName.trim() : undefined,
        contactEmail: withContact && contactEmail.trim() ? contactEmail.trim() : undefined,
        ...(illegal ? { legalGround, goodFaith } : {}),
      });
      setBusy(false);
      if (!r.ok) {
        setError(reportErrorText(r.status, r.message, kind));
        return;
      }
      setSent(`PJ-${r.value!.reference}`);
    } else {
      setSent(demoReference(`${orgId}/${itemId}/${reason}`));
    }
    window.scrollTo(0, 0);
  };

  return {
    anonymous,
    reason,
    reasonLabel: REPORT_REASONS.find((r) => r.id === reason)?.label,
    setReason,
    missingReason: tried && !reason,
    illegal,
    /** o que falta na notificação (só se mostra depois de tentar enviar) */
    missing: (f: NoticeField) => tried && problems.includes(f),
    legalGround,
    setLegalGround,
    goodFaith,
    setGoodFaith,
    withContact,
    /** o servidor confirma a receção e diz a decisão por email (só no modo API) */
    byEmail: apiMode && withContact,
    detail,
    setDetail,
    contactName,
    setContactName,
    contactEmail,
    setContactEmail,
    busy,
    error,
    sent,
    send,
  };
}

export type ReportState = ReturnType<typeof useReport>;
