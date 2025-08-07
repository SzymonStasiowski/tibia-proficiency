-- Builds System Database Schema
-- Run this in your QA Supabase SQL Editor first, then production when ready

-- ============================================================================
-- BUILDS TABLE
-- ============================================================================
-- Stores named build configurations for weapons
CREATE TABLE IF NOT EXISTS builds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weapon_id UUID NOT NULL REFERENCES weapons(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- e.g., "Ice Damage Solo Hunting"
  description TEXT, -- Optional detailed description of the build
  situation_tags TEXT[], -- e.g., ["ice_damage", "solo", "hunting", "bosses"]
  selected_perks JSONB NOT NULL, -- Array of perk IDs, same format as votes
  creator_id UUID REFERENCES creators(id), -- Optional creator attribution
  user_session VARCHAR(255), -- Session of user who created it (for non-creators)
  vote_count INTEGER DEFAULT 0, -- Cached count of votes for this build
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT builds_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT builds_selected_perks_not_empty CHECK (jsonb_array_length(selected_perks) > 0),
  CONSTRAINT builds_session_or_creator CHECK (
    (creator_id IS NOT NULL AND user_session IS NULL) OR 
    (creator_id IS NULL AND user_session IS NOT NULL)
  )
);

-- ============================================================================
-- BUILD VOTES TABLE
-- ============================================================================
-- Tracks who voted for which builds (separate from perk votes)
CREATE TABLE IF NOT EXISTS build_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  user_session VARCHAR(255) NOT NULL,
  creator_id UUID REFERENCES creators(id), -- Optional creator voting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one vote per build per user/creator
  UNIQUE(build_id, user_session),
  
  -- Constraint: either regular user or creator, not both
  CONSTRAINT build_votes_session_or_creator CHECK (
    (creator_id IS NOT NULL) OR 
    (creator_id IS NULL AND user_session IS NOT NULL)
  )
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_builds_weapon_id ON builds(weapon_id);
CREATE INDEX IF NOT EXISTS idx_builds_situation_tags ON builds USING GIN(situation_tags);
CREATE INDEX IF NOT EXISTS idx_builds_vote_count ON builds(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_builds_created_at ON builds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_build_votes_build_id ON build_votes(build_id);
CREATE INDEX IF NOT EXISTS idx_build_votes_user_session ON build_votes(user_session);

-- ============================================================================
-- TRIGGERS FOR VOTE COUNT UPDATES
-- ============================================================================
-- Function to update build vote count
CREATE OR REPLACE FUNCTION update_build_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE builds 
    SET vote_count = vote_count + 1,
        updated_at = NOW()
    WHERE id = NEW.build_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE builds 
    SET vote_count = vote_count - 1,
        updated_at = NOW()
    WHERE id = OLD.build_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update vote counts
DROP TRIGGER IF EXISTS trigger_update_build_vote_count ON build_votes;
CREATE TRIGGER trigger_update_build_vote_count
  AFTER INSERT OR DELETE ON build_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_build_vote_count();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on builds table
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read builds
CREATE POLICY "builds_select_all" ON builds
  FOR SELECT USING (true);

-- Policy: Users can create builds (with proper session validation)
CREATE POLICY "builds_insert_authenticated" ON builds
  FOR INSERT WITH CHECK (
    (user_session IS NOT NULL AND LENGTH(user_session) >= 20) OR
    (creator_id IS NOT NULL)
  );

-- Policy: Users can update their own builds
CREATE POLICY "builds_update_own" ON builds
  FOR UPDATE USING (
    (user_session = current_setting('request.jwt.claims', true)::json->>'user_session') OR
    (creator_id = current_setting('request.jwt.claims', true)::json->>'creator_id'::text)::uuid
  );

-- Enable RLS on build_votes table
ALTER TABLE build_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read build votes (for counting)
CREATE POLICY "build_votes_select_all" ON build_votes
  FOR SELECT USING (true);

-- Policy: Users can vote on builds
CREATE POLICY "build_votes_insert_authenticated" ON build_votes
  FOR INSERT WITH CHECK (
    (user_session IS NOT NULL AND LENGTH(user_session) >= 20) OR
    (creator_id IS NOT NULL)
  );

-- Policy: Users can delete their own votes
CREATE POLICY "build_votes_delete_own" ON build_votes
  FOR DELETE USING (
    (user_session = current_setting('request.jwt.claims', true)::json->>'user_session') OR
    (creator_id = current_setting('request.jwt.claims', true)::json->>'creator_id'::text)::uuid
  );

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================
-- View for popular builds with aggregated data
CREATE OR REPLACE VIEW popular_builds AS
SELECT 
  b.*,
  w.name as weapon_name,
  w.weapon_type,
  w.image_url as weapon_image_url,
  c.channel_name as creator_name,
  c.creator_slug,
  COALESCE(b.vote_count, 0) as total_votes
FROM builds b
JOIN weapons w ON b.weapon_id = w.id
LEFT JOIN creators c ON b.creator_id = c.id
ORDER BY b.vote_count DESC, b.created_at DESC;

-- View for builds by situation tags
CREATE OR REPLACE VIEW builds_by_situation AS
SELECT 
  unnest(situation_tags) as situation_tag,
  COUNT(*) as build_count,
  AVG(vote_count) as avg_votes
FROM builds
WHERE situation_tags IS NOT NULL
GROUP BY unnest(situation_tags)
ORDER BY build_count DESC;

-- ============================================================================
-- SAMPLE DATA FOR TESTING (Optional - remove in production)
-- ============================================================================
-- Note: Only run this section in your QA environment for testing

/*
-- Example situation tags that might be commonly used:
-- Damage types: "ice_damage", "earth_damage", "fire_damage", "physical_damage"
-- Play styles: "solo", "team", "hunting", "bosses", "pvp"
-- Situations: "low_level", "high_level", "profit", "experience"

-- Example build (uncomment to test):
-- INSERT INTO builds (weapon_id, name, description, situation_tags, selected_perks, user_session)
-- SELECT 
--   w.id,
--   'Ice Damage Solo Build',
--   'Optimized for solo hunting with ice damage focus',
--   ARRAY['ice_damage', 'solo', 'hunting'],
--   '["perk-id-1", "perk-id-2", "perk-id-3"]'::jsonb,
--   'test_session_12345678901234567890'
-- FROM weapons w 
-- WHERE w.name = 'Sanguine Rod' 
-- LIMIT 1;
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the setup worked correctly:

-- Check if tables were created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('builds', 'build_votes');

-- Check if indexes were created
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('builds', 'build_votes');

-- Check if triggers were created
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'build_votes';