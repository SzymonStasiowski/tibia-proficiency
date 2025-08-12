## Imbuements ETL Spec

- Sources: [add wiki URLs]
- Fields: name, tier, allowed_slots[], icon_url, source_url.
- Normalize: tier int, slots array.
- Unique: lower(name).
- Media: kind=imbuement-icon.
- Validation: tier in 1..3, slots not empty.
- QA: count rows, % with icon_media_id.

