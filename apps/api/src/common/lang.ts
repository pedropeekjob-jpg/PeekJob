import { z } from 'zod';

/** Idioma dos emails: português por omissão, inglês se a web o pedir */
export const Lang = z.enum(['pt', 'en']).default('pt');
export type Lang = z.infer<typeof Lang>;
export const pick = (lang: Lang, pt: string, en: string) => (lang === 'en' ? en : pt);
