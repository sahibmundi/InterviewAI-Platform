---
name: Imported workspace setup
description: Non-obvious setup requirements for this imported multi-artifact project.
---

Imported artifact workflows may start before `node_modules` exists, so the first setup action is a lockfile-preserving `pnpm install` followed by workflow restarts. Clerk-backed routes also need the project’s Clerk secret and publishable values before protected requests can initialize.

**Why:** The initial workflows failed before application code ran because Vite and esbuild were absent; after dependencies were installed, the API still returned 500 until Clerk was configured.

**How to apply:** When this project is imported into a new workspace or checkpoint, inspect workflow logs for missing packages first, then verify Clerk setup before debugging dashboard route code.

## Identity data contract

Just-in-time local user provisioning must hydrate a valid Clerk email before returning dashboard/profile data. The API response schema validates `candidate.email` as an email, so an empty placeholder identity causes authenticated dashboard requests to return 500 even when Clerk, the database, and the session are healthy.

**Why:** A signed-in user reached `/api/dashboard`, but the first-run local record used an empty email and failed response validation.

**How to apply:** When adding or repairing Clerk-to-database provisioning, source the primary Clerk email and repair existing blank local records before constructing API response objects.