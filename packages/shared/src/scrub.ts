/**
 * Retira dados pessoais de textos técnicos (mensagens de erro, stack traces, caminhos)
 * antes de saírem para logs ou serviços de monitorização.
 */
export function scrubText(s: string): string {
  return s
    .replace(/(https?:\/\/[^\s?#'")]+)[?#][^\s'")]*/g, '$1') // query strings e # (tokens, emails em URLs)
    .replace(/[\w.+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){1,8}/g, '[email]') // tamanhos limitados: sem backtracking excessivo
    .replace(/[A-Za-z0-9_-]{32,}/g, '[token]')
    .replace(/(?<![\w/.:-])\d{9}(?![\w])/g, '[nif]'); // NIF ou telefone (não números dentro de caminhos/linhas)
}
