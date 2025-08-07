-- =============================================================================
-- SAMPLE BUILDS DATA FOR TESTING
-- =============================================================================
-- Run this in your QA Supabase SQL Editor to add test builds

-- First, let's add some builds with proper perk combinations
DO $$
DECLARE
    weapon_record RECORD;
    perk_combinations JSONB[];
    build_names TEXT[];
    descriptions TEXT[];
    tag_combinations TEXT[][];
    i INTEGER;
BEGIN
    -- Get all weapons that have perks
    FOR weapon_record IN 
        SELECT DISTINCT w.id, w.name 
        FROM weapons w 
        JOIN perks p ON w.id = p.weapon_id 
        LIMIT 3  -- Just first 3 weapons for testing
    LOOP
        -- Get different perk combinations for this weapon
        SELECT ARRAY[
            (SELECT jsonb_agg(p.id) FROM perks p WHERE p.weapon_id = weapon_record.id AND p.tier_level IN (0,1) LIMIT 2),
            (SELECT jsonb_agg(p.id) FROM perks p WHERE p.weapon_id = weapon_record.id AND p.tier_level IN (1,2) LIMIT 2),
            (SELECT jsonb_agg(p.id) FROM perks p WHERE p.weapon_id = weapon_record.id AND p.tier_level IN (0,2) LIMIT 2)
        ] INTO perk_combinations;
        
        -- Define build templates
        build_names := ARRAY[
            'Ice Damage Solo Hunter',
            'Team Support Build', 
            'Boss Killer Supreme',
            'PvP Burst Build',
            'Profit Hunting Optimization',
            'Low Level Friendly',
            'Endgame DPS Monster'
        ];
        
        descriptions := ARRAY[
            'Optimized for solo hunting with maximum ice damage output. Perfect for ice-vulnerable creatures.',
            'Support-focused build for team hunting. Provides utility and consistent damage.',
            'High burst damage specifically designed for boss encounters and mini-bosses.',
            'PvP-oriented build focusing on burst damage and survival in player combat.',
            'Efficiency build focused on maximum profit per hour while hunting.',
            'Beginner-friendly build that works well with lower level equipment.',
            'Maximum DPS build for high-level players with endgame equipment.'
        ];
        
        tag_combinations := ARRAY[
            ARRAY['ice_damage', 'solo', 'hunting'],
            ARRAY['team', 'hunting', 'experience'],
            ARRAY['bosses', 'high_level', 'physical_damage'],
            ARRAY['pvp', 'burst', 'high_level'],
            ARRAY['profit', 'solo', 'hunting', 'low_level'],
            ARRAY['solo', 'low_level', 'experience'],
            ARRAY['high_level', 'physical_damage', 'solo']
        ];
        
        -- Insert builds for this weapon
        FOR i IN 1..LEAST(array_length(build_names, 1), array_length(perk_combinations, 1)) LOOP
            IF perk_combinations[i] IS NOT NULL AND jsonb_array_length(perk_combinations[i]) > 0 THEN
                INSERT INTO builds (
                    weapon_id, 
                    name, 
                    description, 
                    situation_tags, 
                    selected_perks, 
                    user_session,
                    vote_count
                ) VALUES (
                    weapon_record.id,
                    build_names[i] || ' (' || weapon_record.name || ')',
                    descriptions[i],
                    tag_combinations[i],
                    perk_combinations[i],
                    'qa_test_' || i::text || '_' || extract(epoch from now())::text,
                    (random() * 15 + 5)::integer  -- Random vote count between 5-20
                );
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Added builds for weapon: %', weapon_record.name;
    END LOOP;
    
    -- Add some build votes
    FOR i IN 1..50 LOOP
        INSERT INTO build_votes (build_id, user_session)
        SELECT 
            b.id, 
            'qa_voter_' || i::text || '_' || extract(epoch from now())::text
        FROM builds b 
        ORDER BY random() 
        LIMIT 1
        ON CONFLICT (build_id, user_session) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Sample builds and votes created successfully!';
END $$;

-- Verify the data
SELECT 
    b.name,
    b.situation_tags,
    b.vote_count,
    w.name as weapon_name
FROM builds b
JOIN weapons w ON b.weapon_id = w.id
ORDER BY b.vote_count DESC;

-- Check vote counts are updating correctly
SELECT 
    'Total builds' as metric, 
    COUNT(*)::text as value 
FROM builds
UNION ALL
SELECT 
    'Total build votes' as metric, 
    COUNT(*)::text as value 
FROM build_votes;

-- Show popular builds view
SELECT * FROM popular_builds LIMIT 5;