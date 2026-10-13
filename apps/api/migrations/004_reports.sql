-- Denúncias de avaliações (Regulamento dos Serviços Digitais: notificação e ação)
CREATE TABLE reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id         uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reason            text NOT NULL CHECK (reason IN ('nome', 'ofensa', 'falso', 'privado', 'ilegal', 'outro')),
  details           text NOT NULL DEFAULT '',
  reporter_ref      text,                 -- pseudónimo de quem denuncia (se tiver sessão)
  reporter_ip_hash  text,                 -- HMAC do IP, só para limitar abusos; nunca o IP
  contact_name      text,                 -- opcional; apagado depois de comunicar a decisão
  contact_email     text,                 -- opcional; apagado depois de comunicar a decisão
  lang              text NOT NULL DEFAULT 'pt' CHECK (lang IN ('pt', 'en')),
  status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'upheld', 'rejected')),
  decided_at        timestamptz,
  decided_by        uuid REFERENCES users(id) ON DELETE SET NULL,
  decision_note     text,
  created_at        timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX reports_one_open_per_reporter ON reports (review_id, reporter_ref) WHERE reporter_ref IS NOT NULL AND status = 'open';
CREATE INDEX reports_open ON reports (status, created_at);
CREATE INDEX reports_ip ON reports (reporter_ip_hash, created_at);

-- Mensagens privadas: além do apoio (red flags), avisos de moderação
ALTER TABLE support_messages
  ADD COLUMN type text NOT NULL DEFAULT 'support' CHECK (type IN ('support', 'moderation')),
  ADD COLUMN details jsonb,
  ALTER COLUMN kinds SET DEFAULT '{}';
