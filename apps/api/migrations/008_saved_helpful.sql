-- Organizações guardadas e "útil" nas avaliações, na conta (antes ficavam só no browser).
-- Ligadas ao pseudónimo (HMAC) da pessoa, como as avaliações; apagam-se com a conta.
CREATE TABLE saved_orgs (
  user_ref    text NOT NULL,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_ref, org_id)
);
CREATE INDEX saved_orgs_user ON saved_orgs (user_ref, created_at DESC);

-- Quem achou útil não é público: a lista pública só mostra a contagem
CREATE TABLE review_helpful (
  review_id   uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  voter_ref   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (review_id, voter_ref)
);
CREATE INDEX review_helpful_voter ON review_helpful (voter_ref);
