# VIZO backend — Stage 1 foundation

This is an executable API and database foundation. It is not yet the complete marketplace backend.

## Included

- Fastify API with `GET /health` and database-aware `GET /ready`.
- Environment validation with Zod.
- PostgreSQL connection through `pg`.
- Versioned SQL migration runner with an advisory lock and migration ledger.
- Initial relational schema for users, seller applications/profiles, multilingual categories, products, and product assets.
- Docker Compose for local PostgreSQL + API.
- Unit tests for health, readiness failure, and unknown routes.

## Run locally

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run typecheck
npm test
npm run dev
```

The API listens on port 3000 by default:
- `GET http://localhost:3000/health`
- `GET http://localhost:3000/ready`

## Database migrations

SQL files live in `src/db/migrations` and are applied in filename order. Applied filenames are recorded in `schema_migrations`. Each migration runs in a transaction, and a PostgreSQL advisory lock prevents concurrent migration runners.

The initial schema deliberately stores password hashes only; password hashing and authentication endpoints are not implemented yet. Role values exist as data constraints, but authorization must be enforced server-side before protected routes are added. Admin role assignment must never be exposed as a public registration field.

## Run with Docker

From this directory:

```bash
docker compose up --build
```

Local-only default database credentials are for development convenience only. Set a strong `POSTGRES_PASSWORD` through the local environment before any shared or hosted deployment. Never commit a real `.env` file or production secret.

## Not implemented yet

Authentication, session management, RBAC enforcement, seller approval endpoints, catalog APIs, cart, orders, payments, delivery, complaints, object storage, 3D processing, and frontend integration. Payment providers are not simulated. No production deployment is configured.

## Verification

GitHub Actions runs backend typechecking, unit tests, TypeScript build, and Docker image build for relevant changes. A database-backed migration integration test still needs to be added.
