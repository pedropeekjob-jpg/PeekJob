/**
 * O que se pode denunciar e moderar: avaliações e entrevistas.
 * Consultas fixas por tipo (sem montar SQL com texto): escolhe-se a consulta, não o nome da tabela.
 */
export const CONTENT_KINDS = ['review', 'interview'] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export const CONTENT_SQL: Record<ContentKind, { published: string; lock: string; setStatus: string }> = {
  review: {
    published: `SELECT 1 FROM reviews WHERE id = $1 AND status = 'published'`,
    lock: `SELECT r.id, r.author_ref, r.status, o.name AS org_name FROM reviews r JOIN organizations o ON o.id = r.org_id WHERE r.id = $1 FOR UPDATE OF r`,
    setStatus: `UPDATE reviews SET status = $2 WHERE id = $1`,
  },
  interview: {
    published: `SELECT 1 FROM interviews WHERE id = $1 AND status = 'published'`,
    lock: `SELECT i.id, i.author_ref, i.status, o.name AS org_name FROM interviews i JOIN organizations o ON o.id = i.org_id WHERE i.id = $1 FOR UPDATE OF i`,
    setStatus: `UPDATE interviews SET status = $2 WHERE id = $1`,
  },
};

/** Valores para as colunas (review_id, interview_id): só uma preenchida */
export const targetIds = (kind: ContentKind, id: string): [string | null, string | null] => (kind === 'review' ? [id, null] : [null, id]);

/** O tipo de uma linha com as duas colunas */
export const kindOf = (row: { review_id?: string | null }): ContentKind => (row.review_id ? 'review' : 'interview');
