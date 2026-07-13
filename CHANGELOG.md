# @aarmos/bundle-schema — Changelog

## 0.3.0-rc.2 — 2026-07-13

### Fixed
- **Redaction allowlist preserves chain-integrity fields.** `prevHash`,
  `entryHash`, `steps`, `prev_hash`, and `hash` are now retained during
  export so `.aarmos` bundles remain replayable with
  `aarmos replay --verify-chain`. Closes the format schism between
  `aarmos incident export` and replay.
  See `redaction/aarmos.bundle.v1.json`.

Coordinated bump aligning `next` across `cli@0.21.0-rc.2`,
`avar-core@1.9.0-rc.2`, `invite-schema@0.1.0-rc.2`.

Published from the upstream spec repo
[`Aarmatix/aarmos-bundle-spec`](https://github.com/Aarmatix/aarmos-bundle-spec)
— the monorepo directory is a working copy. See
[`docs/spec-mirrors.md`](../../docs/spec-mirrors.md).

## 0.3.0-rc.1 — 2026-07-11

### Added — Phase 2D (Scoped Tool Invites)
- **`invites/` section** in the bundle: issued invites and redemption
  receipts.
- **`InviteRedemption`** record:
  `{ invite_id, redeemer, ts, action, resource, receipt_id }`.
- Bundle verifier cross-checks: every redemption references a valid
  invite; every AVAR receipt tagged `via_invite` links to a redemption.

## 0.2.0 — 2026-07-10 (Phase 1 · Bundle format)

Initial published bundle schema. See git history.
