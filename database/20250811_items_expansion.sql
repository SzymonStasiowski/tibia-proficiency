-- Items table expansion for scraping Tibia equipment
-- Safe/idempotent migration; can be run multiple times

create extension if not exists pgcrypto;

-- Ensure table exists (aligns with docs/SCHEMA/0001_catalog.sql baseline)
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slot text not null
);

-- Columns required for scraping and presentation
alter table if exists public.items
  add column if not exists category text not null default 'unknown',
  add column if not exists vocation_reqs text[] default '{}',
  add column if not exists level_req int,
  add column if not exists icon_url text,
  add column if not exists icon_media_id uuid references public.media(id) on delete set null,
  add column if not exists armor int,
  add column if not exists attributes text,
  add column if not exists resistances text,
  add column if not exists imbu_slots int,
  add column if not exists source_url text,
  add column if not exists notes text;

-- Helpful unique index (case-insensitive) on name+slot
do $$ begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'items_unique_name_slot'
  ) then
    execute 'create unique index items_unique_name_slot on public.items (lower(name), lower(slot))';
  end if;
end $$;


