# GitHub Actions workflows

## CI

`ci.yml` is now an active validation workflow for the backend foundation. It installs dependencies and runs TypeScript checks, unit tests, a production build, and a Docker image build on pushes to this branch and pull requests to `main`.

The workflow does not deploy anything and does not require production secrets.

## Deployment

The old root-level `deploy.yml` is preserved as a reference file. It is not activated because production infrastructure (VPS, domain, TLS, backup policy, and deployment secrets) has not been configured or verified. Do not copy it into this directory until those prerequisites and the deployment procedure are reviewed.
