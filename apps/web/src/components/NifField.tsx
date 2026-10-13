import { isValidNif, normalizeNif } from '@peekjob/shared';
import { useEffect, useState } from 'react';
import { api, apiMode } from '../api/http';
import { tr } from '../i18n';
import { Icon } from './Icon';
import styles from './NifField.module.css';

export interface NifLookup {
  nif: string;
  status: 'valid' | 'invalid' | 'unavailable';
  name: string | null;
  address: string | null;
  kind: string | null;
}

/** Localidade a partir da morada oficial do VIES ("…, 4000-123 PORTO" → "Porto") */
export function cityFromAddress(address: string | null): string | null {
  const m = address?.match(/\d{4}-\d{3}\s+([^,\n]+)/);
  if (!m) return null;
  return m[1].trim().toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_x, a: string, b: string) => a + b.toUpperCase()).replace(/\b(De|Da|Do|Das|Dos|E)\b/g, (w) => w.toLowerCase());
}

/**
 * NIF com confirmação no registo europeu (VIES): mostra o nome oficial e deixa usá-lo.
 * Obrigatório só para "Nome individual". Para NIFs de pessoas a API nunca devolve o nome.
 */
export function NifField({ value, onChange, required, onOfficial, invalid }: { value: string; onChange: (v: string) => void; required: boolean; onOfficial: (o: { name: string | null; city: string | null }) => void; invalid?: boolean }) {
  const nif = normalizeNif(value);
  const ok = isValidNif(nif);
  const [lookup, setLookup] = useState<NifLookup | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLookup(null);
    if (!ok || !apiMode) return;
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      api<NifLookup>(`/orgs/nif/${nif}`)
        .then((r) => alive && setLookup(r))
        .catch(() => alive && setLookup(null)) // sem sessão ou erro: confirmamos ao adicionar
        .finally(() => alive && setLoading(false));
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
      setLoading(false);
    };
  }, [nif, ok]);

  return (
    <div className={`field ${styles.nif}`}>
      <label htmlFor="nnif">
        {required ? 'NIF' : tr('NIF (opcional)', 'Tax number, NIF (optional)')}
      </label>
      <input className="input mono" id="nnif" inputMode="numeric" autoComplete="off" maxLength={14} value={value} onChange={(e) => onChange(e.target.value)} placeholder="500 000 000" aria-invalid={invalid || (value.trim().length >= 9 && !ok)} aria-describedby="nnif-ajuda" />
      <span id="nnif-ajuda" className={`small muted ${styles.help}`} aria-live="polite">
        {value.trim().length >= 9 && !ok ? (
          <span className={styles.warn}>{tr('Este NIF não é válido. Confirma os 9 dígitos.', 'This NIF isn’t valid. Check the 9 digits.')}</span>
        ) : loading ? (
          tr('A confirmar no registo europeu…', 'Checking the European register…')
        ) : lookup?.status === 'valid' ? (
          <span className={`stack ${styles.found}`}>
            <span className={`row ${styles.ok}`}>
              <Icon name="check" size={16} stroke={2.2} className={styles.okIcon} />
              <span>{lookup.name ? tr(<>Registada como <b>{lookup.name}</b></>, <>Registered as <b>{lookup.name}</b></>) : tr('NIF confirmado no registo europeu.', 'Tax number confirmed in the European register.')}</span>
            </span>
            {lookup.name && (
              <button type="button" className={`link ${styles.use}`} onClick={() => onOfficial({ name: lookup.name, city: cityFromAddress(lookup.address) })}>
                {tr('Usar o nome e a localidade oficiais', 'Use the official name and town')}
              </button>
            )}
          </span>
        ) : lookup?.status === 'invalid' ? (
          tr('Não aparece no registo europeu de IVA (é normal em associações). Confirmamos depois.', 'Not in the European VAT register (normal for associations). We’ll check it later.')
        ) : lookup?.status === 'unavailable' ? (
          tr('Não conseguimos confirmar agora. Confirmamos depois.', 'We couldn’t check it right now. We’ll check it later.')
        ) : ok ? (
          tr('NIF válido.', 'Valid tax number.')
        ) : (
          tr('Com o NIF confirmamos a organização mais depressa.', 'With the NIF we can confirm the organisation faster.')
        )}
      </span>
    </div>
  );
}
