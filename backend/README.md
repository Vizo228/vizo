# VIZO backend

This directory is reserved for the backend implementation.

No complete backend source, Prisma schema, migrations, Docker configuration, or passing backend test suite is being asserted by this placeholder.

## Required implementation

- TypeScript + Node.js API.
- PostgreSQL with versioned migrations.
- Server-side authentication and role-based authorization.
- Seller application and owner approval flow.
- Product, stock, cart, order, complaint, payment, and delivery APIs.
- File storage for images and 3D assets.
- Environment-based secrets; never commit `.env` or credentials.

Before enabling CI, add the real application files and verify every workflow command against the actual package scripts and Docker setup.
