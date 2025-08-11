-- RLS baseline policies for public-facing app
-- Safe defaults: public SELECT; limited INSERT where app writes; no UPDATE/DELETE from anon
-- Service role (used by server-side scripts/routes) bypasses RLS.

-- creators -----------------------------------------------------------------
alter table if exists public.creators enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='creators' and policyname='creators_select_active') then
    create policy creators_select_active on public.creators for select using (is_active = true);
  end if;
end $$;

-- No public insert/update/delete on creators. Use server/service role only.

-- weapons -------------------------------------------------------------------
alter table if exists public.weapons enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='weapons' and policyname='weapons_read_all') then
    create policy weapons_read_all on public.weapons for select using (true);
  end if;
end $$;

-- perks ---------------------------------------------------------------------
alter table if exists public.perks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='perks' and policyname='perks_read_all') then
    create policy perks_read_all on public.perks for select using (true);
  end if;
end $$;

-- builds --------------------------------------------------------------------
alter table if exists public.builds enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='builds' and policyname='builds_read_all') then
    create policy builds_read_all on public.builds for select using (true);
  end if;
end $$;

-- Allow public inserts for builds when either a user_session or creator_id is provided
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='builds' and policyname='builds_insert_session_or_creator') then
    create policy builds_insert_session_or_creator on public.builds for insert with check (
      (user_session is not null) or (creator_id is not null)
    );
  end if;
end $$;

-- No public update/delete on builds (move mutations to server routes if needed)

-- build_votes ----------------------------------------------------------------
alter table if exists public.build_votes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='build_votes' and policyname='build_votes_read_all') then
    create policy build_votes_read_all on public.build_votes for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='build_votes' and policyname='build_votes_insert_session_or_creator') then
    create policy build_votes_insert_session_or_creator on public.build_votes for insert with check (
      (user_session is not null) or (creator_id is not null)
    );
  end if;
end $$;

-- votes ---------------------------------------------------------------------
alter table if exists public.votes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='votes' and policyname='votes_read_all') then
    create policy votes_read_all on public.votes for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='votes' and policyname='votes_insert_session_or_creator') then
    create policy votes_insert_session_or_creator on public.votes for insert with check (
      (user_session is not null) or (creator_id is not null)
    );
  end if;
end $$;

-- media ---------------------------------------------------------------------
alter table if exists public.media enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='media' and policyname='media_read_all') then
    create policy media_read_all on public.media for select using (true);
  end if;
end $$;

-- No public insert/update/delete on media (ingest via server/service role)

-- creators_stats / popular_builds / builds_by_situation are views; RLS enforced via underlying tables.


