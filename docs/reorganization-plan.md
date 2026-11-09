# VIZO repository reorganization plan

## Safety rules

- Work on branch `vizo-reorganization`; do not modify `main` directly.
- Preserve both root-level HTML prototypes and all existing root files.
- Do not rename or delete a prototype until its replacement has been verified.
- Never commit credentials, API keys, private keys, or real `.env` files.
- Keep the pull request in draft until frontend integration and verification are complete.

## Verified current work

### R1 — Safe repository scaffolding

- Documentation, backend foundation, migrations, and CI were added without deleting the original HTML prototypes.
- The original prototypes remain the source material for frontend migration.

### R2 — Seller application API

- Customer accounts submit a seller application with store details, business description, and resume summary or HTTPS link.
- Application status starts as `pending`.
- Only an authenticated administrator can read the review queue and approve/reject an application.
- Approval creates/updates the seller profile and promotes the user role to `seller` in one database statement.
- Public registration cannot select the seller/admin role.
- Resume file upload still requires private object storage; no fake file upload is presented.

### R3 — Measurement-based fit estimator

- The API compares body and garment measurements for chest, waist, hips, shoulders, sleeve length, and garment length.
- It uses separately supplied horizontal/vertical stretch limits.
- It reports oversized, loose, stretching, or too-small fit and suggests minimum measurements when the material limit is exceeded.
- This is a deterministic estimator, not a trained AI model or 3D cloth simulation. GLB mesh measurement extraction and visual cloth deformation remain future integration work.

## Not yet complete

1. Integrate frontend registration/login with the server session API.
2. Replace browser-local seller role creation with a seller application form and pending state.
3. Build an admin dashboard to review applications.
4. Securely provision the first admin account outside public registration.
5. Add private resume upload storage.
6. Extract reliable body/garment measurements from real GLB models.
7. Integrate and test a real cloth simulation/rendering pipeline.
8. Add database-backed integration tests and verify CI, migration, and deployment.

## Acceptance rules

- Keep original files unchanged until a replacement has passed comparison.
- No production deployment until infrastructure and security are reviewed.
- Do not merge to `main` until the frontend is integrated and all required checks pass.
