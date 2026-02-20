-- Add discoverable flag to agents table
-- Controls whether an agent appears in the A2A platform agent directory
ALTER TABLE agents ADD COLUMN IF NOT EXISTS discoverable boolean DEFAULT true;
COMMENT ON COLUMN agents.discoverable IS 'Whether this agent appears in the A2A platform agent directory';
