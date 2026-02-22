-- Expand trigger_type to support entity-based auto-triggers
ALTER TABLE workflow_templates DROP CONSTRAINT IF EXISTS workflow_templates_trigger_type_check;
ALTER TABLE workflow_templates ADD CONSTRAINT workflow_templates_trigger_type_check
  CHECK (trigger_type IN ('manual', 'on_record_change'));

-- Index for fast template matching on entity changes
CREATE INDEX IF NOT EXISTS idx_wf_templates_trigger_config
  ON workflow_templates USING gin(trigger_config)
  WHERE trigger_type = 'on_record_change' AND is_active = true;
