-- Contestar decisões de moderação (Regulamento dos Serviços Digitais, art. 20.º).
-- Cada pedido parte do aviso da decisão que a pessoa recebeu; uma vez por decisão, durante 6 meses.
CREATE TABLE appeals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id         uuid NOT NULL UNIQUE REFERENCES support_messages(id) ON DELETE CASCADE,
  review_id          uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  appellant_ref      text NOT NULL,          -- pseudónimo de quem contesta; nunca sai da API
  side               text NOT NULL CHECK (side IN ('author', 'reporter')),
  original_decision  text NOT NULL CHECK (original_decision IN ('removed', 'rejected')),
  original_note      text,
  text               text NOT NULL,
  status             text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reversed', 'confirmed')),
  decision_note      text,
  decided_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  decided_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX appeals_open ON appeals (status, created_at);
CREATE INDEX appeals_appellant ON appeals (appellant_ref);
