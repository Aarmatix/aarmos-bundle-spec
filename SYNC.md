# Sync policy

This repository is the **canonical upstream** for the `aarmos.bundle/1`
schema, published to npm as
[`@aarmos/bundle-schema`](https://www.npmjs.com/package/@aarmos/bundle-schema).

Aarmos internal tooling (CLI, bridge, PWA) keeps a working copy of the
frozen schema under `packages/bundle-schema/` so it can build against the exact
published version. That working copy is downstream and MUST NOT diverge
from the tag published here.

## Rules

1. **Schema changes land here first** via PR against `main`.
2. **`npm publish` runs from this repo.** Every published version is
   tagged here as `bundle-schema-vX.Y.Z`; registry provenance and the
   tag agree byte-for-byte.
3. **External contributors PR against this repo** — the same PR flow
   maintainers use.
4. **Verification.** Runtime verification lives in the reference
   implementation at
   [`Aarmatix/avar`](https://github.com/Aarmatix/avar), published as
   [`@avar-standard/core`](https://www.npmjs.com/package/@avar-standard/core)
   / [`@avar-standard/verify`](https://www.npmjs.com/package/@avar-standard/verify).
