/**
 * O trabalho de quem avalia (25/10, cliente): cargo e período, perguntados logo a seguir a escolher a organização.
 * Guarda-se o ano de entrada e o de saída; em público só aparece o cargo, se ainda lá trabalha e há quanto tempo
 * (por escalões), nunca os anos: numa casa pequena, as datas certas diziam quem escreveu.
 */
export const JOB_ROLE_MAX = 60;
/** o primeiro ano que se pode escolher */
export const JOB_FIRST_YEAR = 1960;

export interface ReviewJob {
  role: string;
  /** ainda trabalha lá */
  current: boolean;
  /** ano de entrada */
  from: number;
  /** ano de saída (null se ainda lá trabalha) */
  to: number | null;
}

/** Há quanto tempo (ou quanto tempo esteve): menos de 1 ano, 1 a 3 anos, mais de 3 anos */
export type TenureBand = 'lt1' | '1to3' | 'gt3';

export interface PublicJob {
  role: string;
  current: boolean;
  tenure: TenureBand;
}

export const thisYear = () => new Date().getFullYear();

export function tenureBand(from: number, to: number | null, now = thisYear()): TenureBand {
  const years = (to ?? now) - from;
  if (years < 1) return 'lt1';
  return years <= 3 ? '1to3' : 'gt3';
}

/** O que se mostra a toda a gente (sem os anos) */
export const publicJob = (j: ReviewJob | null | undefined, now = thisYear()): PublicJob | null =>
  j ? { role: j.role, current: j.current, tenure: tenureBand(j.from, j.to, now) } : null;

/** Os anos para escolher, do atual para trás */
export const jobYears = (now = thisYear()) => Array.from({ length: now - JOB_FIRST_YEAR + 1 }, (_, i) => now - i);
