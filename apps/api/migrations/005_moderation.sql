-- Registo das decisões de moderação sobre organizações (aprovar / rejeitar)
ALTER TABLE organizations
  ADD COLUMN moderation_note text,
  ADD COLUMN moderated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN moderated_at timestamptz;
