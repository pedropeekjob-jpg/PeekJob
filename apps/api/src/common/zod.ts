import { BadRequestException } from '@nestjs/common';
import type { z, ZodTypeAny } from 'zod';

/** Valida com um schema partilhado (@peekjob/shared); erro 400 com os campos em falha. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new BadRequestException({
      message: 'Dados inválidos',
      issues: r.error.issues.map((i) => ({ path: i.path, message: i.message })),
    });
  }
  return r.data;
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
