# VIZO

VIZO is being reorganized into a maintainable frontend + backend application.

## Current repository state

The existing HTML prototypes are intentionally preserved at the repository root:

- `VIZO_Virtual_try-on_kiri_QA_fixed3_scanfit_fixed.html` — original large prototype; do not overwrite during the migration.
- `Vizo_v3_fixed.html` — separate earlier/alternate prototype; keep until a feature and visual comparison identifies the canonical version.

Neither prototype is being silently renamed or deleted in this reorganization pass.

## Target structure

- `frontend/` — modular web client and its build output.
- `backend/` — API, database schema, migrations, and server tests.
- `.github/workflows/` — GitHub Actions workflows, enabled only after their referenced project files exist.
- `docs/` — architecture, migration decisions, and acceptance evidence.

## Important status

This repository does not yet contain a verified, complete production backend. A design document, generated code excerpt, or workflow file is not proof that an application is implemented or deployed.

The existing root-level `ci.yml` and `deploy.yml` are preserved as reference files. They are not copied into GitHub's active workflow directory until the backend paths and commands they reference have been checked.

## Development principles

1. Preserve both existing HTML prototypes.
2. Never store passwords, tokens, private keys, or production credentials in Git.
3. Store user, product, cart, order, and session data on the server; do not treat browser storage as the source of truth.
4. Do not claim payment success unless a real provider confirms it.
5. Require tests and review before merging reorganization work into `main`.

See [docs/reorganization-plan.md](docs/reorganization-plan.md) for the staged migration plan.
