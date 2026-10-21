import { useEffect, useState, type FocusEvent, type KeyboardEvent } from 'react';
import type { Suggestion } from '../features/search/suggest';
import { tr } from '../i18n';
import { orgTypeLabel } from '../i18n/labels';
import { Icon } from './Icon';
import styles from './Suggest.module.css';

/**
 * Campo com sugestões (padrão combobox da WAI-ARIA): as setas percorrem a lista, Enter escolhe a sugestão ativa
 * (sem nenhuma ativa, Enter pesquisa o que se escreveu), Escape fecha a lista. A lista fecha ao sair do campo.
 */
export function useSuggest({
  id,
  query,
  items,
  onPick,
  closeWhen = false,
}: {
  id: string;
  query: string;
  items: Suggestion[];
  onPick: (s: Suggestion) => void;
  /** fecha a lista quando passa a true (ex.: os resultados da pesquisa já estão à vista); volta a abrir ao escrever */
  closeWhen?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = `${id}-sugestoes`;
  const open = focused && !dismissed && items.length > 0;

  // a cada termo novo a lista volta a abrir, sem nenhuma sugestão ativa
  useEffect(() => {
    setDismissed(false);
    setActive(-1);
  }, [query]);

  useEffect(() => {
    if (closeWhen) setDismissed(true);
  }, [closeWhen]);

  const pick = (s: Suggestion) => {
    setDismissed(true);
    setActive(-1);
    onPick(s);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!items.length) return;
      e.preventDefault();
      setDismissed(false);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      // -1 é o próprio campo: as setas dão a volta pela lista e regressam ao texto escrito
      const n = items.length + 1;
      setActive((a) => ((a + 1 + step + n) % n) - 1);
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === 'Escape' && open) {
      // fecha só a lista (o Escape de um campo de pesquisa limparia o texto)
      e.preventDefault();
      setDismissed(true);
      setActive(-1);
    }
  };

  const inputProps = {
    role: 'combobox' as const,
    'aria-autocomplete': 'list' as const,
    'aria-expanded': open,
    'aria-controls': listId,
    'aria-activedescendant': open && active >= 0 ? `${listId}-${active}` : undefined,
    onKeyDown,
    onFocus: () => setFocused(true),
    onBlur: (e: FocusEvent<HTMLInputElement>) => {
      // tocar numa sugestão não conta como sair (o clique chega depois)
      if (!e.relatedTarget || !(e.relatedTarget as HTMLElement).closest?.(`#${listId}`)) setFocused(false);
    },
  };

  const list = (
    <>
      <ul id={listId} role="listbox" aria-label={tr('Sugestões', 'Suggestions')} className={styles.list} hidden={!open}>
        {open &&
          items.map((s, i) => (
            <li
              key={`${s.kind}-${'id' in s ? s.id : s.label}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={styles.option}
              // o campo mantém o foco ao carregar com o rato
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(s)}
            >
              <Icon name={ICON[s.kind]} size={16} className={styles.icon} />
              <span className={styles.text}>
                <span className={styles.label}>{s.label}</span>
                <span className={styles.sub}>{subText(s)}</span>
              </span>
            </li>
          ))}
      </ul>
      <span className="sr-only" role="status">
        {open ? tr(`${items.length} sugestões, usa as setas para escolher`, `${items.length} suggestions, use the arrow keys to choose`) : ''}
      </span>
    </>
  );

  return { inputProps, list, open };
}

const ICON = { org: 'building', role: 'briefcase', sector: 'grid', place: 'pin' } as const;

function subText(s: Suggestion) {
  switch (s.kind) {
    case 'org':
      return [s.type ? orgTypeLabel(s.type) : tr('Organização', 'Organisation'), s.city].filter(Boolean).join(' · ');
    case 'role':
      return s.orgs ? tr(`Profissão · em ${s.orgs} ${s.orgs === 1 ? 'organização' : 'organizações'}`, `Job · at ${s.orgs} ${s.orgs === 1 ? 'organisation' : 'organisations'}`) : tr('Profissão', 'Job');
    case 'sector':
      return tr('Setor', 'Sector');
    case 'place':
      return tr('Sítio', 'Place');
  }
}
