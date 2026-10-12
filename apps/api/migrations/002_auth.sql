-- Contas sem email em claro: só o HMAC do email (para reencontrar a conta).
CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash     text NOT NULL UNIQUE,
  role           text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz
);

-- Links mágicos: guardamos só o hash do token; uso único; 15 minutos.
CREATE TABLE login_tokens (
  token_hash  text PRIMARY KEY,
  email_hash  text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_tokens_email ON login_tokens (email_hash, created_at);

-- Sessões: o cookie leva um id aleatório; guardamos só o hash.
CREATE TABLE sessions (
  id_hash     text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user ON sessions (user_id);
