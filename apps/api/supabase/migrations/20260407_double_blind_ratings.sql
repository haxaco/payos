-- Double-blind bidirectional ratings for A2A marketplace.
--
-- Previously: only buyers rated providers (one-directional, immediately visible).
-- Now: both sides rate. Ratings are hidden until the counterparty also submits.
--
-- direction: who is rating whom
--   'buyer_rates_provider' — caller/buyer rates the provider agent
--   'provider_rates_buyer' — provider rates the caller/buyer
--
-- revealed: false until counterparty submits their rating for the same task
-- counterparty_feedback_id: links the two ratings for the same task

ALTER TABLE a2a_task_feedback
  ADD COLUMN IF NOT EXISTS direction TEXT
    CHECK (direction IN ('buyer_rates_provider', 'provider_rates_buyer'))
    DEFAULT 'buyer_rates_provider';

ALTER TABLE a2a_task_feedback
  ADD COLUMN IF NOT EXISTS revealed BOOLEAN DEFAULT TRUE;
  -- Default TRUE for backwards compatibility (existing ratings are already visible)

ALTER TABLE a2a_task_feedback
  ADD COLUMN IF NOT EXISTS counterparty_feedback_id UUID REFERENCES a2a_task_feedback(id);

-- Index for finding counterparty ratings quickly
CREATE INDEX IF NOT EXISTS a2a_feedback_task_direction_idx
  ON a2a_task_feedback (task_id, direction);

-- Update existing ratings: they're all buyer_rates_provider and already revealed
UPDATE a2a_task_feedback SET direction = 'buyer_rates_provider', revealed = TRUE
  WHERE direction IS NULL;

COMMENT ON COLUMN a2a_task_feedback.direction IS
  'Who is rating: buyer_rates_provider (caller rates fulfiller) or provider_rates_buyer (fulfiller rates caller)';
COMMENT ON COLUMN a2a_task_feedback.revealed IS
  'Double-blind: rating hidden until counterparty also rates. Revealed when both sides submit.';
COMMENT ON COLUMN a2a_task_feedback.counterparty_feedback_id IS
  'Links to the other side''s rating for the same task. Set when both ratings are revealed.';
