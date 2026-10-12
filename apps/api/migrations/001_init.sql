-- PeekJob · esquema inicial
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent não é IMMUTABLE; este invólucro permite usá-lo em colunas geradas e índices
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

CREATE TYPE org_type AS ENUM ('PME', 'Associação', 'Voluntariado', 'Nome individual');
CREATE TYPE org_status AS ENUM ('pending', 'active', 'merged', 'rejected');
CREATE TYPE org_source AS ENUM ('seed', 'user', 'claimed', 'import');

CREATE TABLE organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nif           char(9) UNIQUE,
  nif_verified  boolean NOT NULL DEFAULT false,
  name          text NOT NULL,
  search_name   text GENERATED ALWAYS AS (lower(f_unaccent(name))) STORED,
  type          org_type NOT NULL,
  city          text NOT NULL,
  search_city   text GENERATED ALWAYS AS (lower(f_unaccent(city))) STORED,
  sector        text,
  cae           text,
  status        org_status NOT NULL DEFAULT 'pending',
  source        org_source NOT NULL DEFAULT 'user',
  created_by    text,                       -- pseudónimo de quem criou (HMAC), nunca o email
  merged_into   uuid REFERENCES organizations(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  activated_at  timestamptz
);
CREATE INDEX organizations_search_trgm ON organizations USING gin (search_name gin_trgm_ops);
CREATE INDEX organizations_status ON organizations (status);
CREATE INDEX organizations_created_by ON organizations (created_by, created_at);

CREATE TABLE org_aliases (
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alias         text NOT NULL,
  search_alias  text GENERATED ALWAYS AS (lower(f_unaccent(alias))) STORED,
  PRIMARY KEY (org_id, alias)
);
CREATE INDEX org_aliases_trgm ON org_aliases USING gin (search_alias gin_trgm_ops);

CREATE TABLE org_locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label       text,
  address     text NOT NULL,
  city        text,
  lat         double precision,
  lng         double precision,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Proveniência de cada dado (licenças e RGPD)
CREATE TABLE org_sources (
  id          bigserial PRIMARY KEY,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  field       text NOT NULL,
  source      text NOT NULL,
  license     text,
  fetched_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id),
  location_id  uuid REFERENCES org_locations(id),
  author_ref   text NOT NULL,               -- pseudónimo (HMAC); nunca sai da API
  verified     boolean NOT NULL DEFAULT false,
  scores       jsonb NOT NULL,
  avg          numeric(2,1) NOT NULL,
  recommend    boolean,
  tags         text[] NOT NULL DEFAULT '{}',
  text         text NOT NULL DEFAULT '',
  flagged      boolean NOT NULL DEFAULT false,
  flag_kinds   text[] NOT NULL DEFAULT '{}',
  status       text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'removed')),
  created_at   timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (org_id, author_ref)
);
CREATE INDEX reviews_org ON reviews (org_id, status, created_at DESC);

-- Mensagens privadas de apoio (red flags). Só a própria pessoa as vê.
CREATE TABLE support_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_ref    text NOT NULL,
  review_id   uuid REFERENCES reviews(id) ON DELETE CASCADE,
  kinds       text[] NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz
);
CREATE INDEX support_messages_user ON support_messages (user_ref, created_at DESC);
