-- Charms table safety and icon_url column for original source icons
-- Idempotent: safe to run multiple times

create extension if not exists pgcrypto;

-- Ensure table exists (aligns with docs/SCHEMA/0001_catalog.sql baseline)
create table if not exists public.charms (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  type text not null,
  description text,
  icon_media_id uuid references public.media(id) on delete set null,
  source_url text
);

-- Add original icon URL column used during scraping before media backfill
alter table if exists public.charms
  add column if not exists icon_url text;


