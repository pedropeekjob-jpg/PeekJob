-- Quem escreveu pode editar a avaliação publicada (retificação, RGPD art. 16.º); a data fica visível.
ALTER TABLE reviews ADD COLUMN edited_at timestamptz;
