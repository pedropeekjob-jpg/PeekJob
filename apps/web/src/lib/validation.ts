/**
 * Validação simples de email no browser (a API valida a sério): um "@", sem espaços,
 * com algo antes e um domínio com ponto que não está nas pontas. Sem expressões regulares.
 */
export function isEmailLike(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > 254 || /\s/.test(s)) return false;
  const at = s.indexOf('@');
  if (at < 1 || at !== s.lastIndexOf('@')) return false;
  const domain = s.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}
