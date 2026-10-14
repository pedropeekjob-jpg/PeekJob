-- Contas das organizações: reivindicar a página, responder às avaliações e plano Pro.
-- Quem gere uma página tem um pseudónimo próprio (member_ref, outro espaço do HMAC), diferente do
-- que assina avaliações: as tabelas das organizações não se cruzam com as das avaliações.

ALTER TABLE organizations
  ADD COLUMN plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro'));

-- Pedidos para gerir a página (a moderação aprova). Guarda-se o domínio do email, nunca o endereço.
CREATE TABLE org_claims (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_ref    text NOT NULL,
  method        text NOT NULL CHECK (method IN ('email', 'document')),
  email_domain  text,
  name          text NOT NULL,       -- quem pede (age em nome da organização)
  role          text NOT NULL,       -- cargo
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decision_note text,
  decided_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  decided_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX org_claims_one_pending ON org_claims (org_id, member_ref) WHERE status = 'pending';
CREATE INDEX org_claims_pending ON org_claims (status, created_at);

-- Códigos enviados ao email de trabalho para reivindicar (o email não é guardado)
CREATE TABLE org_claim_codes (
  member_ref    text NOT NULL,
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email_domain  text NOT NULL,
  code_hash     text NOT NULL,
  attempts      int NOT NULL DEFAULT 0,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_ref, org_id)
);

CREATE TABLE org_members (
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_ref  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (org_id, member_ref)
);
CREATE INDEX org_members_member ON org_members (member_ref);

-- Resposta pública da organização a uma avaliação (uma por avaliação, editável)
CREATE TABLE review_replies (
  review_id   uuid PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_ref  text,                  -- quem respondeu (NULL se apagou a conta: a resposta é da organização)
  text        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at  timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX review_replies_org ON review_replies (org_id, created_at);
