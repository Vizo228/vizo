# VIZO

VIZO is being reorganized into a maintainable frontend + backend application.

## Current repository state

The existing HTML prototypes are intentionally preserved at the repository root:

- `VIZO_Virtual_try-on_kiri_QA_fixed3_scanfit_fixed.html` — original large prototype; do not overwrite during the migration.
- `Vizo_v3_fixed.html` — separate earlier/alternate prototype; keep until a feature and visual comparison identifies the canonical version.

Neither prototype is silently renamed or deleted.

## New backend capabilities on the reorganization branch

- Server-side seller applications that remain pending until an administrator reviews them.
- Admin-only application queue and approve/reject endpoint. Approval creates a seller profile and grants the seller role server-side.
- Measurement-based garment-fit estimator that checks garment/body dimensions against supplied fabric stretch limits and flags oversized or too-small fit.

These are backend capabilities, not a claim that the original HTML frontend is already integrated. The existing browser-local seller registration and local 3D preview still need to be connected/replaced before these policies are enforced in the public website.

The fit estimator is not yet a trained AI model or a physical cloth simulator. It does not yet derive measurements from GLB meshes or render simulated cloth. See [backend/README.md](backend/README.md).

## Target structure

- `frontend/` — modular web client and its build output.
- `backend/` — API, database schema, migrations, and server tests.
- `.github/workflows/` — GitHub Actions workflows.
- `docs/` — architecture, migration decisions, and acceptance evidence.

## Development principles

1. Preserve both existing HTML prototypes.
2. Never store passwords, tokens, private keys, or production credentials in Git.
3. Store user, product, cart, order, and session data on the server; do not treat browser storage as the source of truth.
4. Do not claim payment success unless a real provider confirms it.
5. Require tests and review before merging reorganization work into `main`.
