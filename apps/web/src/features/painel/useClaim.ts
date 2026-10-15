import { useCallback, useState } from 'react';
import { claimByDocument, confirmClaim, sendClaimCode } from '../../api/accounts';
import { errorText } from '../../api/http';
import type { Org } from '../../data/orgs';
import { isEmailLike } from '../../lib/validation';

export type ClaimMethod = 'email' | 'document';
export type ClaimStep = 'form' | 'code' | 'sent';

/** Pedir para gerir a página: escolher a organização (por omissão, a sugerida), provar (email com código ou documento) e enviar */
export function useClaim(onSent: () => void, suggested?: Org | null) {
  const [picked, setOrg] = useState<Org | null>(null);
  const org = picked ?? suggested ?? null;
  const [method, setMethod] = useState<ClaimMethod>('email');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<ClaimStep>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const who = { name: name.trim(), role: role.trim() };
  const whoOk = who.name.length >= 2 && who.role.length >= 2;
  const canSend = !!org && whoOk && !busy && (method === 'email' ? isEmailLike(email) : !!file);
  const canConfirm = /^\d{6}$/.test(code) && !busy;

  const run = useCallback(async (call: () => Promise<unknown>, next: ClaimStep) => {
    setBusy(true);
    setError('');
    try {
      await call();
      setStep(next);
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const send = async () => {
    if (!org || !canSend) return;
    if (method === 'email') await run(() => sendClaimCode(org.id, email.trim()), 'code');
    else if (await run(() => claimByDocument(org.id, file!, who), 'sent')) onSent();
  };
  const confirm = async () => {
    if (!org || !canConfirm) return;
    if (await run(() => confirmClaim(org.id, code, who), 'sent')) onSent();
  };
  const pick = (o: Org) => {
    setOrg(o);
    setError('');
  };

  return { org, pick, method, setMethod, name, setName, role, setRole, email, setEmail, code, setCode: (v: string) => setCode(v.replace(/\D/g, '').slice(0, 6)), file, setFile, step, busy, error, canSend, canConfirm, send, confirm };
}

export type ClaimForm = ReturnType<typeof useClaim>;
