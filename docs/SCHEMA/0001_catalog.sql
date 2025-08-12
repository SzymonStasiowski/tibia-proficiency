-- Catalog schema: items, imbuements, charms (showcase-only)

-- Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  -- Equipment slot this item occupies (e.g., helmet, armor, legs, boots, offhand)
  slot text NOT NULL,
  -- High-level category such as helmet, armor, legs, boots, shield, spellbook, quiver, amulet, ring
  category text NOT NULL,
  -- Vocation requirements; empty array means usable by all
  vocation_reqs text[] DEFAULT '{}',
  -- Minimum level requirement to equip
  level_req int,
  -- Visuals: original icon URL and normalized media reference once imported
  icon_url text,
  icon_media_id uuid REFERENCES media(id),
  -- Combat/stat fields captured as-is from source
  armor int,
  attributes text,
  resistances text,
  imbu_slots int,
  -- Provenance
  source_url text,
  notes text
);

CREATE UNIQUE INDEX IF NOT EXISTS items_unique_name_slot
  ON items (lower(name), lower(slot));

CREATE TABLE IF NOT EXISTS imbuements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  tier int,
  allowed_slots text[] NOT NULL,
  icon_media_id uuid REFERENCES media(id),
  source_url text
);

CREATE TABLE IF NOT EXISTS charms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  type text NOT NULL,
  description text,
  icon_media_id uuid REFERENCES media(id),
  source_url text
);

