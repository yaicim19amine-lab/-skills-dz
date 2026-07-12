-- Add media and platform fields
ALTER TABLE formations ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT '';
ALTER TABLE formations ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '';
ALTER TABLE formations ADD COLUMN IF NOT EXISTS testimonials TEXT DEFAULT '';

ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'youtube';
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS session_url TEXT DEFAULT '';
