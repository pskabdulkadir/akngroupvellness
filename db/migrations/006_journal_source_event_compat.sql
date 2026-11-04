ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS source_event_type VARCHAR(64),
  ADD COLUMN IF NOT EXISTS source_event_id VARCHAR(128);

UPDATE journal_entries
SET source_event_type = COALESCE(NULLIF(source_event_type, ''), 'LEGACY'),
    source_event_id = COALESCE(NULLIF(source_event_id, ''), 'LEGACY-' || id::text)
WHERE source_event_type IS NULL OR source_event_type = ''
   OR source_event_id IS NULL OR source_event_id = '';

ALTER TABLE journal_entries
  ALTER COLUMN source_event_type SET NOT NULL,
  ALTER COLUMN source_event_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_source_event
  ON journal_entries(source_event_type, source_event_id);
