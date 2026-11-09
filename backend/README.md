# VIZO backend — Stage 1 foundation

This is the first executable API foundation, not the complete marketplace backend.

## Included

- Fastify API with `GET /health` and database-aware `GET /ready`.
- Environment validation with Zod.
- PostgreSQL connection through `pg`.
- Docker Compose for local PostgreSQL + API.
- Unit tests for health, readiness failure, and unknown routes.

## Run locally

```bash
cp .env.example .env
npm install
npm run typecheck
npm test
npm run dev
```

The API listens on port 3000 by default:
- `GET http://localhost:3000/health`
- `GET http://localhost:3000/ready`

## Run with Docker

From this directory:

```bash
docker compose up --build
```

Local-only default database credentials are for development convenience only. Set a strong `POSTGRES_PASSWORD` through the local environment before any shared or hosted deployment. Never commit a real `.env` file or production secret.

## Not implemented yet

Authentication, RBAC, Prisma migrations, seller applications, catalog, cart, orders, payments, delivery, complaints, file storage, 3D processing, and frontend integration. Payment providers are not simulated. No production deployment is configured.

## Verification status

The source and test files have been committed, but dependency installation, TypeScript checks, unit tests, and Docker health checks have not yet been run in this session. The CI workflow is intended to perform the reproducible checks on GitHub.
