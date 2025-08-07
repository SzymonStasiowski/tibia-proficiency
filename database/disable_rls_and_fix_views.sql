-- ============================================================================
-- Disable RLS and switch views to SECURITY INVOKER (QA/dev convenience script)
-- Run this in Supabase SQL editor. This will:
--  - Drop any existing RLS policies on key tables
--  - Disable RLS on those tables
--  - Set views to SECURITY INVOKER to avoid "Security Definer View" warnings
-- Note: This reduces security and should not be used in production.
-- ============================================================================

-- 1) Make views run with the invoker's permissions
ALTER VIEW IF EXISTS public.popular_builds SET (security_invoker = on);
ALTER VIEW IF EXISTS public.builds_by_situation SET (security_invoker = on);
ALTER VIEW IF EXISTS public.creator_stats SET (security_invoker = on);

-- 2) Ensure functions (if any) run as invoker (safe no-op if already so)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_build_vote_count'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.update_build_vote_count() SECURITY INVOKER';
  END IF;
END $$;

-- 3) Drop all policies on selected tables (handles unknown policy names)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('builds', 'build_votes', 'votes', 'perks', 'weapons', 'creators')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 4) Disable RLS on those tables (safe if already disabled)
ALTER TABLE IF EXISTS public.builds DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.build_votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.perks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weapons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creators DISABLE ROW LEVEL SECURITY;

-- 5) Optional: verify state
-- SELECT viewname, security_invoker FROM pg_views WHERE schemaname = 'public' AND viewname IN ('popular_builds','builds_by_situation','creator_stats');
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('builds','build_votes','votes','perks','weapons','creators');
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- ============================================================================
-- Re-enable guidance (keep for future):
--   ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY some_policy ON public.builds FOR SELECT USING (true);
--   ALTER VIEW public.popular_builds SET (security_invoker = off); -- definer
-- ============================================================================


