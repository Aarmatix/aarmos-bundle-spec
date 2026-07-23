# @aarmos/bundle-schema

Frozen schema for the **Aarmos Bundle** — the signed, self-contained
container that carries AVAR receipts, policy snapshots, connector-egress
ledger rows, and guardrail events out of an Aarmos workspace to any
consumer (auditor, insurer, SOC, legal) that has the `avar` binary.

- Schema id: `aarmos.bundle/1`
- Container: `.aarmos` = ZIP archive
- Producer: `aarmos incident export` (in `@aarmos/cli`)
- Consumer: `avar verify <bundle>` — standalone [`avar`](https://github.com/Aarmatix/avar) binary (`brew install aarmatix/tap/avar`) or [`@aarmos/cli`](https://www.npmjs.com/package/@aarmos/cli); chain math from [`@avar-standard/core`](https://www.npmjs.com/package/@avar-standard/core)

## Layout inside a `.aarmos` file

```
manifest.json         # bundle id, workspace (hashed), window, versions, content digest
receipts/*.jsonl      # AVAR v2 receipt chains, ordered, hash-linked
policies/*.yaml       # ASP policy snapshots active during the window
policies/matrix.json  # compiled action×resource matrix + attenuation graph
egress/ledger.jsonl   # connector-egress rows (toolId, protocol, unattributed)
guardrails/*.jsonl    # repeat-guard, call-ceiling, cost-ceiling events
anchor.json           # OPTIONAL — Rekor inclusion proof when --anchor rekor
signatures/manifest.sig  # detached Ed25519 signature over manifest.json
```

## Reproducibility

Same window + same underlying state MUST produce an identical
`manifest.json.contentDigest`. The bundle carries no wall-clock
timestamps beyond the declared `window.from` / `window.to`.

## Redaction

Before signing, the producer runs the redaction allowlist in
`redaction/aarmos.bundle.v1.json`. It is an **allowlist**, not a
denylist: any field not on the list is stripped. Prompts, tool
payloads, and secret material are never on the list.

## What's NOT in a bundle

- Raw prompts
- Tool request/response bodies
- User PII
- TLS-decrypted traffic (ever)

See `docs/roadmap/moat-layers.md` §0 and Phase 1 for the source of
truth.
