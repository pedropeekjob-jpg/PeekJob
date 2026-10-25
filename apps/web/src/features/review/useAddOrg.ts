import { findMunicipality, isValidNif, normalizeNif, type District } from '@peekjob/shared';
import { useCallback, useState } from 'react';
import type { OrgType } from '../../data/orgs';
import { tr } from '../../i18n';
import { useStore } from '../../lib/store';

export interface NewOrg {
  name: string;
  type: OrgType;
  city: string;
  /** distrito do concelho escolhido nas sugestões (ou reconhecido no que se escreveu) */
  district: District | null;
  nif: string;
}

/** Mensagem de erro do formulário de nova organização, ou null se estiver tudo certo (função pura) */
export function validateNewOrg(o: NewOrg): string | null {
  if (!o.name.trim()) return tr('Escreve o nome da organização.', 'Enter the organisation’s name.');
  if (!o.city.trim()) return tr('Escreve a localidade.', 'Enter the town or city.');
  const nif = normalizeNif(o.nif);
  if (nif && !isValidNif(nif)) return tr('O NIF não é válido.', 'The tax number isn’t valid.');
  if (!nif && o.type === 'Nome individual') return tr('Para quem trabalha em nome individual, o NIF é obrigatório.', 'For a sole trader, the tax number (NIF) is required.');
  return null;
}

/** Formulário "adicionar organização que não está cá": estado, validação e envio */
export function useAddOrg() {
  const { addOrg, updateDraft } = useStore();
  const [form, setForm] = useState<NewOrg>({ name: '', type: 'Empresa', city: '', district: null, nif: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = useCallback(<K extends keyof NewOrg>(k: K, v: NewOrg[K]) => setForm((f) => ({ ...f, [k]: v })), []);

  /** Recomeça com o nome que a pessoa estava a procurar */
  const start = useCallback((name: string) => {
    setForm((f) => ({ ...f, name: name || f.name }));
    setError('');
  }, []);

  /** Cria a organização (ou devolve a existente com o mesmo NIF) e põe-na no rascunho; true se correu bem */
  const submit = useCallback(async (): Promise<boolean> => {
    if (busy) return false;
    const invalid = validateNewOrg(form);
    if (invalid) {
      setError(invalid);
      return false;
    }
    const nif = normalizeNif(form.nif);
    // concelho escrito à mão: fica com a grafia oficial e o distrito; outra localidade vai tal como está
    const known = form.district ? { name: form.city.trim(), district: form.district } : findMunicipality(form.city);
    const city = known?.name ?? form.city.trim();
    setBusy(true);
    const r = await addOrg({ name: form.name.trim(), type: form.type, city, ...(known ? { district: known.district } : {}), ...(nif ? { nif } : {}) });
    setBusy(false);
    if (!r.ok) {
      setError(r.status === 401 ? tr('Entra primeiro para adicionar uma organização.', 'Sign in first to add an organisation.') : r.message);
      return false;
    }
    updateDraft({ locationId: 'sede' });
    return true;
  }, [addOrg, busy, form, updateDraft]);

  return { form, set, error, busy, start, submit };
}
