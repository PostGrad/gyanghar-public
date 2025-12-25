-- Add meditation_watch_time column to accountability_entries table
-- This column will store the duration (in minutes) of meditation video watched or meditation done by the student

ALTER TABLE accountability_entries
ADD COLUMN meditation_watch_time TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Meditation watch time in minutes (0-60)';

-- Add a check constraint to ensure the value is between 0 and 60
ALTER TABLE accountability_entries
ADD CONSTRAINT chk_meditation_watch_time CHECK (meditation_watch_time >= 0 AND meditation_watch_time <= 60);

-- Verify the column was added successfully
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'accountability_entries'
  AND COLUMN_NAME = 'meditation_watch_time';

