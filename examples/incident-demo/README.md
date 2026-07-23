# incident-demo — worked example fixture (Phase 1 / P1.d)

A minimal, synthetic **Aarmos Bundle** a stranger can verify end-to-end in
under five minutes with only the `avar` binary installed. No account, no
network — everything runs against the file in this directory.

## What's in this folder

| Path                              | What it is                                                             |
| --------------------------------- | ---------------------------------------------------------------------- |
| `incident-demo.aarmos`            | Signed, deterministic bundle (zip). This is the auditor artifact.      |
| `incident-demo.report.html`       | Reference HTML report produced by `avar verify --report`.              |
| `unpacked/`                       | Same bundle, unzipped. Read `manifest.json` to see the schema in situ. |
| `build.mjs`                       | Deterministic rebuilder. `node build.mjs` regenerates identical bytes. |

The bundle carries a synthetic 3-receipt scenario: an agent reads a ticket
(allow), is denied when it tries to reply outside its tenant, and an
attenuated child agent posts to Slack (allow). It also includes a policy
YAML + 8×8 matrix, a 2-row connector-egress ledger, and one guardrail
deny event — one file per bundle content group.

## Verify in under 5 minutes

1. **Install the standalone verifier** (no Aarmos account required):

   ```bash
   brew tap aarmatix/tap && brew install avar
   # or:  curl -fsSL https://get.aarmos.io/avar | sh
   ```

2. **Verify the bundle offline:**

   ```bash
   avar verify ./incident-demo.aarmos
   ```

   Expected output:

   ```
   ✓ signature valid (Ed25519, kid=kid_demo_fixture_v1)
   ✓ contentDigest matches   sha256:387fcc20…7f9b1689
   ✓ 5 declared files present, hashes match
   verdict: VALID
   ```

3. **Emit the auditor HTML report:**

   ```bash
   avar verify ./incident-demo.aarmos --report ./my-report.html
   open ./my-report.html   # or: xdg-open
   ```

   Compare against the committed `incident-demo.report.html` — they should
   render identically.

4. **Tamper test — prove the verifier catches edits.** Unzip, change a
   receipt row, rezip, re-verify:

   ```bash
   unzip -o incident-demo.aarmos -d /tmp/tamper && \
     sed -i.bak 's/"decision":"deny"/"decision":"allow"/' /tmp/tamper/receipts/chain-0001.jsonl && \
     ( cd /tmp/tamper && zip -qr /tmp/tampered.aarmos . ) && \
     avar verify /tmp/tampered.aarmos ; echo "exit=$?"
   ```

   Expected: `verdict: INVALID`, non-zero exit, `hash-mismatch` on
   `receipts/chain-0001.jsonl`.

That's the full loop: **export → verify → report → tamper detect**, offline,
under 5 minutes, against a bundle whose bytes you can regenerate yourself.

## Reproducibility

The demo signing key is derived from a fixed 32-byte seed committed inside
`build.mjs`. It is **synthetic and public by design** — its only purpose is
to let anyone re-sign the fixture. Never reuse it for anything real; it is
not a workspace key.

`node build.mjs` MUST produce byte-identical `incident-demo.aarmos` and
`unpacked/**` on every run. Any diff after a rebuild is a regression — file
it against `@aarmos/bundle-schema`.

## Schema reference

- Bundle schema: [`packages/bundle-schema/schemas/manifest.schema.json`](../../schemas/manifest.schema.json)
- Redaction allowlist: [`packages/bundle-schema/redaction/aarmos.bundle.v1.json`](../../redaction/aarmos.bundle.v1.json)
- Canonical paths / types: [`packages/bundle-schema/src/index.ts`](../../src/index.ts)
- Verifier: [`avar verify`](https://github.com/Aarmatix/avar) (standalone binary) or [`@aarmos/cli`](https://www.npmjs.com/package/@aarmos/cli)
- Producer: `aarmos incident export` — shipped in [`@aarmos/cli`](https://www.npmjs.com/package/@aarmos/cli)
