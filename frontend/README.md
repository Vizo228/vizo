# VIZO frontend

The original HTML prototypes remain preserved at the repository root. The integration preview loads the canonical large prototype without editing it, then adds an API integration layer in the iframe.

## Run the integrated preview

1. Start PostgreSQL and the API from `backend/` (see `backend/README.md`).
2. In a second terminal, from the repository root run:

   ```bash
   python -m http.server 8080
   ```

3. Open `http://localhost:8080/frontend/vizo-integrated-preview.html`.
4. The preview uses `http://localhost:3000` as the API by default. Use the **API URL** button in the app navigation to change it for another backend host.
5. Register a normal account. To apply as a seller, use the seller switch and submit the application. An administrator account must be provisioned out-of-band as described in `backend/README.md`; sign in with it to review and approve/reject applications.

## Integrated features

- Browser-local login is replaced by backend register/login/logout and bearer sessions.
- Seller registration creates a customer account first. A seller application is submitted separately and stays pending until admin review.
- Admin-only queue with approve/reject controls and review notes.
- A measurement-based fit screen calls `POST /api/try-on/fit-analysis` and displays per-measurement fit status and size recommendations.
- The original product catalog and 3D prototype are loaded unchanged inside the preview.

## Important boundaries

The integration preview does not make the original 3D engine into an AI cloth simulator. Fit analysis uses manually supplied measurements and fabric stretch percentages. GLB measurement extraction, geometry-to-geometry fit, cloth deformation, and calibrated material simulation remain future engineering work. Resume uploads are currently text/HTTPS-link only.

For a hosted frontend, set backend `CORS_ORIGIN` to its exact origin. Do not use wildcard CORS for a production deployment.
