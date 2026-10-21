-- Parâmetros do tipo de trabalho (nota de 1 a 5 ou sim/não) e um comentário curto por critério ou parâmetro.
ALTER TABLE reviews ADD COLUMN extras jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE reviews ADD COLUMN comments jsonb NOT NULL DEFAULT '{}'::jsonb;
