# VIZO frontend

This directory is reserved for the modular frontend migration.

## Source preservation

The current prototypes remain at the repository root. They are the source material for the migration and must not be overwritten or deleted:

- `../VIZO_Virtual_try-on_kiri_QA_fixed3_scanfit_fixed.html`
- `../Vizo_v3_fixed.html`

The large original prototype could not be safely copied or split as part of this documentation-only pass. No claim is made that a modular frontend or `index.html` has been built yet.

## Next acceptance steps

1. Compare both prototypes and identify the canonical version with the project owner.
2. Inventory scripts, styles, assets, and 3D-engine dependencies.
3. Extract modules without changing existing behavior.
4. Add a reproducible build that produces a runnable preview.
5. Test the built site against the preserved original.
