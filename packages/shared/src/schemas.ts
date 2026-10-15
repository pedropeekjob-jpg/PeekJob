import { z } from 'zod';
import { CRITERION_KEYS, ORG_TYPES, REVIEW_TAGS, REVIEW_TEXT_MAX } from './criteria';
import { DISTRICTS } from './districts';
import { isValidNif, normalizeNif } from './nif';

const nifField = z
  .string()
  .transform(normalizeNif)
  .refine(isValidNif, { message: 'NIF inválido' });

export const CreateOrganizationInput = z
  .object({
    name: z.string().trim().min(2, 'Nome demasiado curto').max(120),
    type: z.enum(ORG_TYPES),
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

export const CreateReviewInput = z.object({
  locationId: z.string().uuid().optional(),
  scores: z
    .object(Object.fromEntries(CRITERION_KEYS.map((k) => [k, score.optional()])) as Record<(typeof CRITERION_KEYS)[number], z.ZodOptional<typeof score>>)
    .strict()
    .refine((s) => Object.values(s).some((v) => v != null), { message: 'Dá pelo menos uma nota' }),
  recommend: z.boolean().nullable().default(null),
  tags: z.array(z.enum(REVIEW_TAGS)).max(REVIEW_TAGS.length).default([]),
  text: z.string().trim().max(REVIEW_TEXT_MAX).default(''),
});
export type CreateReviewInput = z.infer<typeof CreateReviewInput>;

/** Editar a própria avaliação: as mesmas regras, sem mudar o local */
export const UpdateReviewInput = CreateReviewInput.omit({ locationId: true });
export type UpdateReviewInput = z.infer<typeof UpdateReviewInput>;

export const SearchOrganizationsQuery = z.object({
  q: z.string().trim().max(120).default(''),
  type: z.enum(ORG_TYPES).optional(),
  includePending: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchOrganizationsQuery = z.infer<typeof SearchOrganizationsQuery>;
