-- Entrevistas e salários partilhados por quem se candidatou ou trabalha na organização.
-- Como nas avaliações: só o pseudónimo de quem partilhou (author_ref), nunca o email.

CREATE TABLE interviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_ref  text NOT NULL,
  role        text NOT NULL,
  positive    boolean NOT NULL,
  offer       boolean NOT NULL,
  answered    boolean NOT NULL DEFAULT true,          -- a organização chegou a responder
  difficulty  smallint CHECK (difficulty BETWEEN 1 AND 5),
  steps       text[] NOT NULL,
  text        text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'removed')),
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (org_id, author_ref)
);
CREATE INDEX interviews_org ON interviews (org_id, status, created_at DESC);

-- Um salário por pessoa e organização: voltar a partilhar substitui (o salário muda com o tempo).
-- Os valores só saem agregados (percentis), e só com pelo menos 3 por função.
CREATE TABLE salaries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_ref     text NOT NULL,
  role           text NOT NULL,
  monthly_gross  integer NOT NULL CHECK (monthly_gross BETWEEN 100 AND 50000),
  paid_on_time   boolean,
  created_at     timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at     timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (org_id, author_ref)
);
