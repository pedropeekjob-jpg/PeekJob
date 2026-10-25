-- 25/10 (cliente): "PME" e "Grande empresa" passam a um só tipo, "Empresa" (a dimensão é que distingue pequenas e grandes).
-- Mudar o nome do valor do enum muda todas as linhas de uma vez; as grandes passam também a "Empresa".
-- O valor 'Grande empresa' fica no enum sem uso (o PostgreSQL não tira valores de um enum), e a API já não o aceita.
ALTER TYPE org_type RENAME VALUE 'PME' TO 'Empresa';
UPDATE organizations SET type = 'Empresa' WHERE type = 'Grande empresa';
