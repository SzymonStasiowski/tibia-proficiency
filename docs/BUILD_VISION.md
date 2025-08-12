## Build Vision

- Scope now: showcase-only builds. No effect math or DPS calculators.
- Features: Equipment, Imbuements, Charms, existing Weapon Proficiency.
- Users assemble builds and share; app displays a clean summary of selections.
- Catalog data comes from Tibia Wiki via scrapers; media stored in Supabase `media`.
- Later: Wheel of Destiny, Gem Atelier, optional calculators.

Routes
- /build/new: build composer
- /build/[slug]: build viewer (share page)
- /items, /imbuements, /charms: optional browse pages

Principles
- JSON-first build config for speed; normalized catalogs for stability.
- Idempotent, rate-limited scrapers with caching and attribution.
- Keep tasks small; each change references a spec in docs/.

