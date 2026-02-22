-- ============================================
-- AP2 Mandate Payment Instrument Binding
-- Adds funding_source_id and settlement_rail to ap2_mandates
-- ============================================

ALTER TABLE ap2_mandates
  ADD COLUMN funding_source_id UUID REFERENCES funding_sources(id) ON DELETE SET NULL,
  ADD COLUMN settlement_rail TEXT CHECK (settlement_rail IN (
    'auto','internal','circle_usdc','base_chain','pix','spei',
    'wire','ach','visa_pull','mastercard_pull','mock'
  ));

CREATE INDEX idx_ap2_mandates_funding_source ON ap2_mandates(funding_source_id) WHERE funding_source_id IS NOT NULL;
CREATE INDEX idx_ap2_mandates_settlement_rail ON ap2_mandates(settlement_rail) WHERE settlement_rail IS NOT NULL;
