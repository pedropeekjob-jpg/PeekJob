-- Domínios de email conhecidos de cada organização (opcional; reforça a verificação por email)
CREATE TABLE org_domains (
  org_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain  text NOT NULL,
  PRIMARY KEY (org_id, domain)
);

-- Códigos enviados para o email de trabalho: guardamos só o hash do código, nunca o email.
CREATE TABLE verification_codes (
  user_ref    text NOT NULL,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code_hash   text NOT NULL,
  attempts    int NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_ref, org_id)
);

-- O resultado: só o "sim" (quem, onde, como, quando). Nada do email ou do documento.
CREATE TABLE verifications (
  user_ref    text NOT NULL,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  method      text NOT NULL CHECK (method IN ('email', 'document')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_ref, org_id)
);
