# VIZO backend — seller onboarding and fit-estimation stage

The backend now includes the initial API foundation plus server-side seller approval and a measurement-based garment-fit estimator.

## Implemented endpoints

### Seller onboarding

- `POST /api/seller-applications` — authenticated customer submits a store application, business details, description, and a resume summary or HTTPS resume link. New applications are always `pending`.
- `GET /api/seller-applications/me` — applicant checks their application history and review status.
- `GET /api/admin/seller-applications?status=pending&limit=50&offset=0` — admin-only application queue.
- `POST /api/admin/seller-applications/:id/review` — admin-only approval or rejection. Approval creates/updates the seller profile and promotes the user to `seller` in the same SQL statement. Rejection never grants seller access.

Public registration does not accept a client-selected role. There is no public admin-registration route. To bootstrap the first administrator, first create and verify the account through the backend registration flow, then have an authorized database operator run a one-time statement such as:\n\n```sql\nUPDATE users SET role = 'admin', updated_at = NOW() WHERE email = LOWER('verified-admin@example.com');\n```\n\nReplace the example with the verified account email; do not expose this operation through the public API.

Resume files are not uploaded to this API yet. Applicants can provide a resume summary or HTTPS link. Private file uploads require a configured object-storage provider and access controls; the API does not fetch or trust remote resume links.

### Fit estimator

- `POST /api/try-on/fit-analysis` — authenticated dimension comparison for body and garment measurements, with horizontal and vertical material stretch limits.

The estimator reports oversized/loose fit, acceptable stretch, or too-small dimensions and recommends minimum garment measurements when the fabric stretch limit is exceeded.

**Important scope boundary:** this is a deterministic, physics-informed sizing estimator, not a trained AI model or cloth simulation. It does not currently parse GLB geometry, infer measurements from 3D meshes, render cloth deformation, calculate collision/folds/seams/friction, or predict tearing. Body and garment measurements and fabric stretch percentages must be supplied by a trusted upstream measurement pipeline. The existing HTML/Three.js prototype is preserved and is not yet connected to these APIs.

## Run locally

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run typecheck
npm test
npm run dev
```

The API listens on port 3000 by default. Set CORS_ORIGIN to a comma-separated list of exact frontend origins; the local defaults cover ports 5173 and 8080. For a hosted frontend, add its exact HTTPS origin to the backend environment. The frontend sends bearer tokens and does not require cookie credentials.\n\nThe API listens on port 3000 by default:
- `GET http://localhost:3000/health`
- `GET http://localhost:3000/ready`

## Database migrations

SQL files live in `src/db/migrations` and are applied in filename order. Applied filenames are recorded in `schema_migrations`. Each migration runs in a transaction, and a PostgreSQL advisory lock prevents concurrent migration runners.

## Run with Docker

```bash
docker compose up --build
```

Local-only default database credentials are for development convenience only. Set a strong `POSTGRES_PASSWORD` through the local environment before any shared or hosted deployment. Never commit a real `.env` file or production secret.

## Remaining work

- Connect the existing frontend login/session flow to the API and replace local seller-role registration with the application form.
- Add private resume-file storage and malware/content validation.
- Provision the first administrator securely out-of-band and build the admin review UI.
- Extract and validate measurements from actual person and garment GLB models.
- Integrate a real cloth simulation/rendering pipeline and calibrate fabric stretch using measured material data.
- Add database-backed integration tests and run the complete CI workflow.
- Deploy only after infrastructure and security review.

Payment providers are not simulated. No production deployment is configured.
