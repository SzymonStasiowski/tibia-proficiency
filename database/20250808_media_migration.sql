-- Media migration: storage-backed images and FKs
-- Safe to run multiple times; uses IF NOT EXISTS guards

-- Enable pgcrypto for gen_random_uuid if not already enabled
create extension if not exists pgcrypto;

-- 1) media table
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  source_url text,
  storage_path text not null,
  width integer null,
  height integer null,
  format text null,
  bytes integer null,
  sha256 bytea not null unique,
  attribution text null,
  created_at timestamptz not null default now()
);

-- Unique on non-null source_url values only
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'media_source_url_partial_uniq'
  ) then
    execute 'create unique index media_source_url_partial_uniq on public.media (source_url) where source_url is not null';
  end if;
end $$;

-- Helpful indexes
create index if not exists media_storage_path_idx on public.media (storage_path);
create index if not exists media_created_at_idx on public.media (created_at desc);

-- 2) weapons FK to media
alter table if exists public.weapons
  add column if not exists image_media_id uuid null references public.media(id) on delete set null;

-- 3) perks FKs to media
alter table if exists public.perks
  add column if not exists main_media_id uuid null references public.media(id) on delete set null,
  add column if not exists type_media_id uuid null references public.media(id) on delete set null;

-- 4) Views are unaffected; optional later update to expose derived URLs

-- 5) Optional RLS policies (read-only for anon). Adjust to your needs.
-- If RLS is enabled on public schema by default, ensure media is readable by anon.
do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'media') then
    -- Enable RLS if not already
    execute 'alter table public.media enable row level security';
    -- Create read policy if not exists
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'media' and policyname = 'media_read_all'
    ) then
      execute 'create policy media_read_all on public.media for select using (true)';
    end if;
    -- No insert/update/delete policy; writes happen via server/service role.
  end if;
end $$;

-- 6) Comment for attribution usage
comment on column public.media.attribution is 'License/credit string for the asset (e.g., Tibia Wiki / Fandom)';


