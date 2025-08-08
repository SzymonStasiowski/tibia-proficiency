Image migration to Supabase Storage

Scope
- Move external image URLs (Tibia Wiki/Fandom etc.) into Supabase Storage public bucket `images-public`.
- Track metadata in `public.media` and link via FKs on `weapons` and `perks`.
- Provide API endpoint for ad-hoc ingest and a Node backfill for bulk import.

Prereqs
- Environment vars (server only):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (never exposed to client; used by API and backfill)

Database
- Apply `database/20250808_media_migration.sql` to create `public.media` and add FKs:
  - `weapons.image_media_id` → `media(id)`
  - `perks.main_media_id`, `perks.type_media_id` → `media(id)`

Storage
- Create bucket `images-public` (public read):
  - Dashboard: Storage → New bucket → name `images-public` → Public bucket: ON
  - or CLI: supabase storage create-bucket images-public --public
- Path scheme:
  - weapons/{weaponSlug}/{sha256}.{ext}
  - perks/main/{sha256}.{ext}
  - perks/type/{sha256}.{ext}
- Cache: `Cache-Control: public, max-age=31536000, immutable`

API endpoint
- `POST /api/media/import`
  Body: `{ url, kind: 'weapon'|'perk-main'|'perk-type', slugOrId?, attribution? }`
  - Fetch → validate image → sha256 → dedupe by sha/source_url → upload → insert `media` → return `{ id, storage_path, publicUrl }`.

Backfill
- `scripts/backfill-images.ts` (Node runtime):
  - Concurrency control; resumable via `.backfill-progress.json`.
  - Dedupe by sha; retries can be added by re-running.
  - Updates FKs on `weapons` and `perks` after insert.

Runbook
1) Canary
   - `tsx scripts/backfill-images.ts --table weapons --limit 50 --concurrency 4 --resume`
   - Spot check a few weapons on Vercel; URLs should be `.../storage/v1/object/public/images-public/...`.
2) Full
   - `tsx scripts/backfill-images.ts --table weapons --concurrency 6 --resume`
   - `tsx scripts/backfill-images.ts --table perks --concurrency 6 --resume`

Observability
- Script writes a resumable checkpoint at project root: `.backfill-progress.json`.
- Optionally export logs to `backups/` by piping output: `... > backups/$(date +%Y%m%d)-backfill.log`.

Rollback
- Frontend helpers prefer stored media; if FKs unset, they fall back to legacy URLs.
- No destructive change to legacy URL columns; storage objects remain cacheable.

Notes
- Respect source host rate limits; adjust `--concurrency` as needed if 429/403 responses are seen.
- Attribution: use `Tibia Wiki (Fandom)` when migrating those assets.


