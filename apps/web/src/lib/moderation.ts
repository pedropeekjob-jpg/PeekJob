// A lógica de moderação vive em @peekjob/shared (é a mesma que a API usa).
export { detectRedFlags, findPersonalAttacks, softenText, toneIssues, type RedFlagResult, type ToneResult } from '@peekjob/shared';
import { findPersonalAttacks } from '@peekjob/shared';

/** true se o texto tiver insultos ou nomes de pessoas (bloqueia a publicação) */
export const hasInsultOrName = (text: string) => findPersonalAttacks(text).blocked;
