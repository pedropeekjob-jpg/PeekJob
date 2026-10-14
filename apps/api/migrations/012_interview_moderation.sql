-- Entrevistas também se denunciam, moderam e contestam (como as avaliações).
-- Cada denúncia, aviso ou pedido de revisão aponta para uma avaliação OU uma entrevista.

ALTER TABLE reports
  ALTER COLUMN review_id DROP NOT NULL,
  ADD COLUMN interview_id uuid REFERENCES interviews(id) ON DELETE CASCADE,
  ADD CONSTRAINT reports_one_target CHECK ((review_id IS NULL) <> (interview_id IS NULL));
CREATE UNIQUE INDEX reports_one_open_per_reporter_interview ON reports (interview_id, reporter_ref)
  WHERE reporter_ref IS NOT NULL AND status = 'open' AND interview_id IS NOT NULL;

ALTER TABLE support_messages
  ADD COLUMN interview_id uuid REFERENCES interviews(id) ON DELETE CASCADE;

ALTER TABLE appeals
  ALTER COLUMN review_id DROP NOT NULL,
  ADD COLUMN interview_id uuid REFERENCES interviews(id) ON DELETE CASCADE,
  ADD CONSTRAINT appeals_one_target CHECK ((review_id IS NULL) <> (interview_id IS NULL));
