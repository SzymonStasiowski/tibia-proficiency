## ETL Playbook (per feature)

Use this checklist whenever we scrape/seed data (items, imbuements, charms, etc.). It captures lessons learned from the items import.

1) Sources
- List URLs and sections to scrape; capture variants with different table headers or layouts.
- Example (items): 9 category pages from TibiaWiki (helmets, armors, legs, boots, shields, spellbooks, quivers, amulets, rings).

2) Extraction
- Prefer dynamic header mapping over fixed column indices; match by header text prefixes (e.g., Item/Name, Arm/Def., Attributes, Resist., Imb. Slots, Lvl, Vocation).
- Skip navigation/summary tables by requiring an Item/Name column and >= 4 columns.
- When a list cell lacks an icon or shows a placeholder, follow the first item link and extract image from infobox or primary figure.

3) Normalization
- Trim and case-fold names; map categories to slots (e.g., shields/spellbooks/quivers → offhand).
- Parse integers for `armor`, `level_req`, `imbu_slots`; normalize vocations to [sorcerer, druid, knight, paladin, monk].

4) Media (Storage)
- Store original `icon_url` first; then backfill to storage-backed `media` and set FK.
- Upload rules:
  - Reject non-image content-types.
  - Reject placeholders: 1x1/tiny images (≤100 bytes) or data: URLs.
  - Dedupe by sha256 but DO NOT reuse media rows whose `source_url` is data: or whose `bytes` ≤ 100.
  - Attribution: `Tibia Wiki (Fandom)`.
- Remediation command: reprocess existing rows linked to placeholders.

5) Deduping & Write Strategy
- Unique keys: define per entity. For items: `lower(name)+lower(slot)`.
- Split insert/update:
  - Insert rows without `id`.
  - Update rows with `id` (don’t upsert with NULL id).

6) Validation
- Validate slot/category enums and non-negative numeric fields.
- Log per-row reasons when skipping.

7) QA
- Counts per category; % rows with `icon_media_id`; duplicates by unique key; missing level/vocation.
- Spot-check several items per category (icon renders, armor/attrs/resists text).

8) Acceptance
- Dry-run shows expected totals by URL; write mode completes without constraint errors.
- Storage: 0 rows linked to placeholder media; icons render in admin grid.

9) Operational tips
- Use caching (local HTML cache) and small randomized delays to avoid 429/503s.
- Keep concurrency modest (2–6) and add exponential backoff with jitter for retries.
- Add per-URL row counts in dry-run to quickly identify pages with alternate layouts.

