-- Geocodificação em segundo plano dos locais adicionados à mão (os importados do OSM já têm coordenadas)
ALTER TABLE org_locations
  ADD COLUMN geocode_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN geocode_next_at  timestamptz,
  ADD COLUMN geocoded_at      timestamptz,
  ADD COLUMN geocode_source   text;
CREATE INDEX org_locations_to_geocode ON org_locations (geocode_next_at) WHERE lat IS NULL;

-- Correção: ao ficar ativa (aprovada, NIF confirmado ou pessoas suficientes a avaliar), os locais
-- da organização passam a ativos. Antes ficavam "pending" e nunca apareciam na página pública.
CREATE FUNCTION activate_org_locations() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' THEN
    UPDATE org_locations SET status = 'active' WHERE org_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER organizations_activate_locations AFTER UPDATE OF status ON organizations
  FOR EACH ROW EXECUTE FUNCTION activate_org_locations();

UPDATE org_locations l SET status = 'active' FROM organizations o WHERE o.id = l.org_id AND o.status = 'active' AND l.status = 'pending';
