---
name: Imported workspace setup
description: Non-obvious setup requirements for this imported multi-artifact project.
---

Imported artifact workflows may start before `node_modules` exists, so the first setup action is a lockfile-preserving `pnpm install` followed by workflow restarts. Clerk-backed routes also need the project’s Clerk secret and publishable values before protected requests can initialize.

**Why:** The initial workflows failed before application code ran because Vite and esbuild were absent; after dependencies were installed, the API still returned 500 until Clerk was configured.

**How to apply:** When this project is imported into a new workspace or checkpoint, inspect workflow logs for missing packages first, then verify Clerk setup before debugging dashboard route code.