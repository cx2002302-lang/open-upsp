# Dependency Upgrade TODO — Deferred Major Versions

Patch/minor upgrades were applied on 2026-07-18 (better-sqlite3 ^12.11.1,
@biomejs/biome ^2.5.4, @types/node ^22.20.1, vitest/@vitest/coverage-v8 ^3.2.7,
plus lockfile-only js-yaml 3.14.2→3.15.0 security fix).

The following **major** upgrades are intentionally deferred. Each needs a
dedicated branch with code-migration work and full regression testing before
landing.

| Package | Current | Latest | Notes |
| --- | --- | --- | --- |
| zod | ^3.25.0 (3.25.76) | 4.4.3 | zod 4 changes error customization APIs (`message` → `error`), `.merge()`/`.deepPartial()` behavior, and error formatting. Audit all schema definitions in `src/`. |
| commander | ^13.0.0 (13.1.0) | 15.0.0 | Review breaking changes across 14/15 (option parsing, error handling exits) against `src/cli.ts`. |
| @types/node | ^22.20.1 | 26.1.1 | Only upgrade together with a Node.js runtime plan; `engines` currently requires `node >=22`. |
| vitest | ^3.2.7 | 4.1.10 | Vitest 4 changes coverage defaults and pool options; must be upgraded together with `@vitest/coverage-v8`. |
| @vitest/coverage-v8 | ^3.2.7 | 4.1.10 | Pair with the vitest 4 upgrade. |
| typescript | ^5.8.0 (5.9.3) | 7.0.2 | TS 7 (native port) is a major toolchain change; validate `tsc` build and editor tooling first. |

Suggested procedure per item: create a branch, bump the version, run
`npm run build && npm test && npm run lint`, fix breakages, then merge.
