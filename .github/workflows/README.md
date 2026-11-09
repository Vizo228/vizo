# GitHub Actions workflows

Workflow activation is intentionally deferred.

The root-level `ci.yml` and `deploy.yml` are preserved as reference files. They currently reference backend paths and commands that have not yet been verified in this repository. Copying them here now would activate workflows that are expected to fail.

Move reviewed workflows into this directory only after the backend implementation exists and the CI commands have been tested. Production deployment must remain disabled until a VPS, domain, TLS, and GitHub Actions secrets have been configured securely.
