-- Notificações de conteúdo ilegal (Regulamento dos Serviços Digitais, art. 16.º, n.º 2):
-- fundamento legal, localização eletrónica exata do conteúdo e declaração de boa-fé.
-- A explicação fundamentada fica em details; o nome e o email em contact_name e contact_email.
ALTER TABLE reports
  ADD COLUMN legal_ground text,
  ADD COLUMN content_url  text,
  ADD COLUMN good_faith   boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT reports_illegal_complete CHECK (reason <> 'ilegal' OR (legal_ground IS NOT NULL AND good_faith)) NOT VALID; -- as antigas ficam como estavam
