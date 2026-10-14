import { useCallback, useState } from 'react';
import { apiMode } from '../../api/http';
import { tr } from '../../i18n';
import { useStore } from '../../lib/store';
import { isEmailLike } from '../../lib/validation';
import { emptyCode, isComplete, type Code } from './code';

export type Method = 'email' | 'documento';

/** Mensagem para uma falha da API ao verificar */
export function verificationError(status: number, message: string): string {
  if (status === 401) return tr('Entra primeiro para verificar.', 'Sign in first to verify.');
  if (status === 415) return tr('Envia o recibo ou contrato em PDF.', 'Send the payslip or contract as a PDF.');
  return message;
}

/**
 * Verificação anónima: email do trabalho (código de 6 dígitos) ou documento (PDF).
 * Na demonstração não há servidor: aceita qualquer código ou ficheiro.
 */
export function useVerification(orgId: string) {
  const { draft, updateDraft, markVerified, sendWorkEmailCode, confirmWorkEmailCode, verifyDocument } = useStore();
  const [method, setMethod] = useState<Method>(draft.verified ?? 'email');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [code, setCode] = useState<Code>(emptyCode);
  const [resent, setResent] = useState(false);
  const [file, setFileState] = useState<File | null>(null);
  const [apiError, setApiError] = useState('');
  const [busy, setBusy] = useState(false);

  const isEmail = method === 'email';
  const codeStep = isEmail && step === 'code';
  const canFinish = isEmail ? codeStep && isComplete(code) : !!file;

  const sendCode = useCallback(async (): Promise<boolean> => {
    if (!isEmailLike(email)) {
      setEmailError(tr('Escreve um email válido, por exemplo nome@organizacao.pt.', 'Enter a valid email, for example name@organisation.com.'));
      return false;
    }
    setEmailError('');
    if (apiMode) {
      setBusy(true);
      const r = await sendWorkEmailCode(orgId, email.trim());
      setBusy(false);
      if (!r.ok) {
        setEmailError(verificationError(r.status, r.message));
        return false;
      }
    }
    setStep('code');
    setResent(false);
    return true;
  }, [email, orgId, sendWorkEmailCode]);

  const resend = useCallback(() => {
    setCode(emptyCode());
    setResent(true);
  }, []);

  const setFile = useCallback((f: File | null) => {
    setFileState(f);
    setApiError('');
  }, []);

  /** Confirma (código ou documento) e marca o rascunho como verificado; true se correu bem */
  const finish = useCallback(async (): Promise<boolean> => {
    if (!canFinish || busy) return false;
    if (apiMode) {
      setApiError('');
      setBusy(true);
      const r = isEmail ? await confirmWorkEmailCode(orgId, code.join('')) : await verifyDocument(orgId, file!);
      setBusy(false);
      if (!r.ok) {
        setApiError(verificationError(r.status, r.message));
        return false;
      }
    }
    updateDraft({ verified: method });
    markVerified(orgId); // avaliações já publicadas nesta organização passam a verificadas
    return true;
  }, [busy, canFinish, code, confirmWorkEmailCode, file, isEmail, markVerified, method, orgId, updateDraft, verifyDocument]);

  return {
    method,
    setMethod,
    step,
    backToEmail: () => setStep('email'),
    email,
    setEmail,
    emailError,
    code,
    setCode,
    resent,
    resend,
    file,
    setFile,
    apiError,
    busy,
    isEmail,
    codeStep,
    canFinish,
    alreadyVerified: draft.verified ?? null,
    sendCode,
    finish,
  };
}
