## Charms ETL Spec

- Sources: [add wiki URLs]
- Fields: name, type, description, icon_url, source_url.
- Normalize: type canonical.
- Unique: lower(name).
- Media: kind=charm-icon.
- Validation: name/type required.
- QA: count rows, % with icon_media_id.

