import { z } from 'zod';
import { CRITERION_KEYS, normalizeOrgType, ORG_TYPES, REVIEW_TAGS, REVIEW_TEXT_MAX } from './criteria';
import { DISTRICTS } from './districts';
import { EXTRA_KEYS, extraKind, extraOptions, isExtraKey, PARAM_COMMENT_MAX, type ExtraKey } from './params';
import { JOB_FIRST_YEAR, JOB_ROLE_MAX, thisYear } from './job';
import { isValidNif, normalizeNif } from './nif';

const nifField = z
  .string()
  .transform(normalizeNif)
  .refine(isValidNif, { message: 'NIF inválido' });

export const CreateOrganizationInput = z
  .object({
    name: z.string().trim().min(2, 'Nome demasiado curto').max(120),
    type: z.preprocess(normalizeOrgType, z.enum(ORG_TYPES)),
    city: z.string().trim().min(2).max(80),
    /** opcional: sem ele, o distrito vem da cidade quando é um concelho sem ambiguidade */
    district: z.enum(DISTRICTS).optional(),
    nif: nifField.optional(),
    address: z.string().trim().max(200).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'Nome individual' && !v.nif) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nif'], message: 'NIF obrigatório para empresas em nome individual' });
    }
  });
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInput>;

const score = z.number().int().min(1).max(5);

const year = z
  .number()
  .int()
  .min(JOB_FIRST_YEAR)
  .refine((v) => v <= thisYear(), { message: 'Ano no futuro' });

/** Cargo e período (25/10): ainda lá trabalha (sem ano de saída) ou já saiu (com ano de saída, igual ou depois da entrada) */
export const ReviewJobInput = z
  .object({
    role: z.string().trim().min(2, 'Escreve o cargo').max(JOB_ROLE_MAX),
    current: z.boolean(),
    from: year,
    to: year.nullable().default(null),
  })
  .superRefine((j, ctx) => {
    if (j.current && j.to !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'Sem ano de saída se ainda lá trabalhas' });
    if (!j.current && j.to === null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'Diz quando saíste' });
    if (j.to !== null && j.to < j.from) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'A saída é antes da entrada' });
  });
export type ReviewJobInput = z.infer<typeof ReviewJobInput>;

export const CreateReviewInput = z.object({
  locationId: z.string().uuid().optional(),
  scores: z
    .object(Object.fromEntries(CRITERION_KEYS.map((k) => [k, score.optional()])) as Record<(typeof CRITERION_KEYS)[number], z.ZodOptional<typeof score>>)
    .strict()
    .refine((s) => Object.values(s).some((v) => v != null), { message: 'Dá pelo menos uma nota' }),
  recommend: z.boolean().nullable().default(null),
  /** cargo e período; a app pede-os sempre, mas as avaliações de antes de 25/10 não os têm */
  job: ReviewJobInput.nullable().optional(),
  tags: z.array(z.enum(REVIEW_TAGS)).max(REVIEW_TAGS.length).default([]),
  text: z.string().trim().max(REVIEW_TEXT_MAX).default(''),
  /** parâmetros do tipo de trabalho: nota de 1 a 5, sim/não ou uma das opções, conforme o parâmetro */
  extras: z
    .record(z.enum(EXTRA_KEYS), z.union([score, z.boolean(), z.string().max(40)]))
    .default({})
    .superRefine((e, ctx) => {
      const ok = { scale: (v: unknown) => typeof v === 'number', yesno: (v: unknown) => typeof v === 'boolean', choice: (v: unknown, k: ExtraKey) => typeof v === 'string' && extraOptions(k).includes(v) };
      const message = { scale: 'Dá uma nota de 1 a 5', yesno: 'Responde sim ou não', choice: 'Escolhe uma das opções' };
      for (const [k, v] of Object.entries(e)) {
        if (!isExtraKey(k)) continue;
        const kind = extraKind(k);
        if (!ok[kind](v, k)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [k], message: message[kind] });
      }
    }),
  /** um comentário curto por critério ou parâmetro (os vazios não se guardam) */
  comments: z
    .record(z.enum([...CRITERION_KEYS, ...EXTRA_KEYS]), z.string().trim().max(PARAM_COMMENT_MAX))
    .default({})
    .transform((c) => Object.fromEntries(Object.entries(c).filter(([, v]) => v)) as typeof c),
});
export type CreateReviewInput = z.infer<typeof CreateReviewInput>;

/** Editar a própria avaliação: as mesmas regras, sem mudar o local */
export const UpdateReviewInput = CreateReviewInput.omit({ locationId: true });
export type UpdateReviewInput = z.infer<typeof UpdateReviewInput>;

export const SearchOrganizationsQuery = z.object({
  q: z.string().trim().max(120).default(''),
  type: z.preprocess(normalizeOrgType, z.enum(ORG_TYPES)).optional(),
  includePending: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchOrganizationsQuery = z.infer<typeof SearchOrganizationsQuery>;

/** Sugestões enquanto se escreve (organizações, profissões, setores e sítios) */
export const SuggestQuery = z.object({
  q: z.string().trim().min(2).max(80),
});
export type SuggestQuery = z.infer<typeof SuggestQuery>;
