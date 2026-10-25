-- Cargo e período de quem avalia (25/10): { role, current, from, to }. Em público só vai o cargo e o escalão de tempo.
-- As avaliações de antes não o têm (null).
ALTER TABLE reviews ADD COLUMN job jsonb;
