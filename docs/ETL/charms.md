## Charms ETL Spec

- Sources:
  - `https://tibia.fandom.com/wiki/Cyclopedia#Charms` (List of Charms)
- Fields: `name`, `type` (`minor`|`major`), `description`, `icon_url`, `source_url`.
- Normalize: map type text to canonical `minor` or `major`.
- Unique: `lower(name)`.
- Media: store `icon_url` first; later backfill to `icon_media_id` via storage importer.
- Validation: name/type required; description optional.
- QA: row count equals table rows on source; % with `icon_media_id` after backfill.

Notes
- The source table may include an icon column; scraper extracts from `<img>` (data-src/srcset/src), `<noscript>`, or `style` background.
- Provenance: set `source_url` to `https://tibia.fandom.com/wiki/Cyclopedia#Charms`.
