import { useState } from 'react';
import { apiMode } from '../../api/http';
import { REPORT_REASONS } from '../../data/content';
import { useStore } from '../../lib/store';
import { demoReference, reportErrorText } from './report';

/** Estado e envio de uma denúncia (modo API: servidor; demonstração: referência local) */
export function useReport(orgId: string | undefined, itemId: string | undefined) {
  const { user, reportReview } = useStore();
  /** sem conta (modo API): pode deixar contacto para saber a decisão (Regulamento dos Serviços Digitais) */
  const anonymous = apiMode && !user;
  const [reason, setReasonState] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<string | null>(null);

  const setReason = (id: string) => {
    setReasonState(id);
    setTried(false);
  };

  const send = async () => {
    if (!reason) {
      setTried(true);
      return;
    }
    if (busy) return;
    if (apiMode && itemId) {
      setBusy(true);
      setError('');
      const r = await reportReview(itemId, {
        reason,
        details: detail.trim(),
        contactName: anonymous && contactName.trim() ? contactName.trim() : undefined,
        contactEmail: anonymous && contactEmail.trim() ? contactEmail.trim() : undefined,
      });
      setBusy(false);
      if (!r.ok) {
        setError(reportErrorText(r.status, r.message));
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
