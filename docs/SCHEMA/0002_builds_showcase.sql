-- Showcase builds with JSON config

CREATE TABLE IF NOT EXISTS character_builds (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE,
  name text NOT NULL,
  vocation text NOT NULL,
  level int,
  build_config jsonb NOT NULL,
  description text,
  tags text[],
  creator_id uuid REFERENCES creators(id),
  user_session text,
  visibility text NOT NULL DEFAULT 'public',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

