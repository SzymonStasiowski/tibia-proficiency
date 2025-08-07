-- =============================================================================
-- BUILDS SYSTEM TABLES ONLY
-- =============================================================================
-- Add these tables to your existing QA database
-- Run this in your QA Supabase SQL Editor

-- ============================================================================
-- BUILDS TABLE
-- ============================================================================
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

-- Policy: Allow all inserts for QA testing (simplify for development)
CREATE POLICY "builds_insert_all" ON builds
  FOR INSERT WITH CHECK (true);

-- Policy: Allow all updates for QA testing (simplify for development)
CREATE POLICY "builds_update_all" ON builds
  FOR UPDATE USING (true);

-- Enable RLS on build_votes table
ALTER TABLE build_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read build votes (for counting)
CREATE POLICY "build_votes_select_all" ON build_votes
  FOR SELECT USING (true);

-- Policy: Allow all voting for QA testing (simplify for development)
CREATE POLICY "build_votes_insert_all" ON build_votes
  FOR INSERT WITH CHECK (true);

-- Policy: Allow all vote deletions for QA testing
CREATE POLICY "build_votes_delete_all" ON build_votes
  FOR DELETE USING (true);

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
-- SAMPLE DATA FOR TESTING
-- ============================================================================
-- Create a few sample builds for testing (adjust perk IDs based on your data)
DO $$
DECLARE
    sample_weapon_id UUID;
    sample_perks JSONB;
    perk1_id TEXT;
    perk2_id TEXT;
    build_record RECORD;
    i INTEGER;
BEGIN
    -- Get a sample weapon ID and some perk IDs
    SELECT w.id INTO sample_weapon_id 
    FROM weapons w 
    LIMIT 1;
    
    -- Get some sample perk IDs for this weapon
    SELECT p1.id, p2.id INTO perk1_id, perk2_id
    FROM perks p1
    CROSS JOIN perks p2
    WHERE p1.weapon_id = sample_weapon_id 
      AND p2.weapon_id = sample_weapon_id
      AND p1.tier_level = 0 
      AND p2.tier_level = 1
    LIMIT 1;
    
    -- Create sample builds if weapon and perks exist
    IF sample_weapon_id IS NOT NULL AND perk1_id IS NOT NULL AND perk2_id IS NOT NULL THEN
        sample_perks := jsonb_build_array(perk1_id, perk2_id);
        
        -- Ice damage solo hunting build
        INSERT INTO builds (weapon_id, name, description, situation_tags, selected_perks, user_session)
        VALUES (
            sample_weapon_id,
            'Ice Damage Solo Build',
            'Optimized for solo hunting with ice damage focus. Great for ice-vulnerable creatures.',
            ARRAY['ice_damage', 'solo', 'hunting'],
            sample_perks,
            'qa_test_session_ice_solo_' || extract(epoch from now())::text
        );
        
        -- Earth damage team build
        INSERT INTO builds (weapon_id, name, description, situation_tags, selected_perks, user_session)
        VALUES (
            sample_weapon_id,
            'Earth Team Hunting',
            'Team-oriented build focused on earth damage and crowd control.',
            ARRAY['earth_damage', 'team', 'hunting'],
            sample_perks,
            'qa_test_session_earth_team_' || extract(epoch from now())::text
        );
        
        -- Boss fighting build
        INSERT INTO builds (weapon_id, name, description, situation_tags, selected_perks, user_session)
        VALUES (
            sample_weapon_id,
            'Boss Destroyer',
            'High DPS build specifically designed for boss encounters.',
            ARRAY['bosses', 'high_level', 'physical_damage'],
            sample_perks,
            'qa_test_session_boss_' || extract(epoch from now())::text
        );
        
        -- Add some sample votes for the builds
        FOR build_record IN SELECT id FROM builds WHERE user_session LIKE 'qa_test_session_%' LOOP
            FOR i IN 1..3 LOOP
                INSERT INTO build_votes (build_id, user_session)
                VALUES (build_record.id, 'qa_voter_' || i::text || '_' || extract(epoch from now())::text)
                ON CONFLICT (build_id, user_session) DO NOTHING;
            END LOOP;
        END LOOP;
        
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the setup worked correctly:

-- Check if tables were created
SELECT 'Tables created successfully' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('builds', 'build_votes');

-- Check sample data
SELECT 'Sample data created' as status;
SELECT COUNT(*) as build_count FROM builds;
SELECT COUNT(*) as vote_count FROM build_votes;

-- Check popular builds view
SELECT 'Popular builds view working' as status;
SELECT * FROM popular_builds LIMIT 3;