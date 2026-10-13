-- Importações de fontes abertas (OpenStreetMap): identificador externo para reimportar sem duplicar
ALTER TABLE org_sources ADD COLUMN external_id text;
CREATE UNIQUE INDEX org_sources_external ON org_sources (source, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX organizations_search_city ON organizations (search_city);
