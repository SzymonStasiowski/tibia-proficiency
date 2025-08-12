## Items ETL Spec

- **Sources**: Tibia Fandom equipment lists per category.
- **Categories**: helmet, armor, legs, boots, shield, spellbook, quiver, amulet, ring.
- **Slot mapping**: shield/spellbook/quiver all map to `offhand` slot.
- **Fields**: `name`, `slot`, `category`, `vocation_reqs[]`, `level_req`, `icon_url`, `icon_media_id`, `armor`, `attributes`, `resistances`, `imbu_slots`, `source_url`.
- **Normalize**: trim/casefold name; parse integer `armor`, `level_req`, `imbu_slots`; canonical vocation strings: `sorcerer`, `druid`, `knight`, `paladin`, `monk`.
- **Unique key**: `lower(name)+lower(slot)`.
- **Media**:
  - store original `icon_url` then backfill to `icon_media_id` via storage import.
  - when list pages don’t expose icons or show 1×1 placeholders, fetch the item page and extract from infobox/figure.
  - uploader must reject data: URLs and 1×1/tiny images (≤100 bytes) and must not dedupe to existing placeholder media rows.
- **Validation**: slot in set [`helmet`, `armor`, `legs`, `boots`, `offhand`, `amulet`, `ring`]; category in set above; non-negative numeric fields.
- **QA**: row counts per category, % with `icon_media_id`, duplicates by name+slot, missing level/vocation. Additionally, count items linked to placeholder media (should be 0).

