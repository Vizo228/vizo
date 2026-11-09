# VIZO repository reorganization plan

## Safety rules

- Work on branch `vizo-reorganization`; do not modify `main` directly.
- Preserve both root-level HTML prototypes and all existing root files.
- Do not rename or delete a prototype until its replacement has been verified.
- Do not activate workflows that reference missing backend files.
- Do not commit credentials, API keys, private keys, or real `.env` files.

## Current verified repository facts

- Two HTML prototype files exist at the repository root.
- Root-level `ci.yml` and `deploy.yml` exist, but GitHub Actions only discovers workflow definitions under `.github/workflows/`.
- The CI definition references a `backend/` project, including package scripts, Docker Compose, and secret-check scripts. Those references must be checked against real files before activation.
- `server.test.mjs` imports `../server.mjs`; that import target is not present at the repository root in the inspected file list.
- No verified production deployment is established by the presence of a deploy workflow.

## Stages

### R1 — Safe repository scaffolding (this change)

Add documentation placeholders for frontend, backend, and workflows. Preserve all existing files. Do not enable workflows or claim that the app has been split.

### R2 — Frontend migration

Compare both HTML prototypes, identify the canonical source, inventory dependencies, and extract modules. Keep byte-identical backups of originals. Verify visual and functional parity before treating the modular frontend as accepted.

### R3 — Backend import and verification

Import the completed backend source, Prisma schema, migrations, Docker configuration, tests, and environment example. Run dependency installation, schema validation, typecheck, unit tests, integration tests, and Docker health checks. Record actual results.

### R4 — CI activation

Review and adapt CI to the real repository layout. Place verified workflows in `.github/workflows/`. Confirm pull-request checks pass before merge.

### R5 — Deployment

Only after production infrastructure is selected and secured: configure DNS, HTTPS, VPS, backups, monitoring, GitHub Actions secrets, and deployment workflow. Keep deployment disabled until an explicit production readiness review.

## Acceptance for R1

- Original files remain present and unchanged.
- New documentation clearly distinguishes placeholders from implemented code.
- No workflow is activated prematurely.
- All changes are isolated on the reorganization branch for review.
