// Deterministic builder for the incident-demo fixture (Phase 1 / P1.d).
//
// Produces:
//   examples/incident-demo/incident-demo.aarmos   (signed zipped bundle)
//   examples/incident-demo/unpacked/*             (same layout, unpacked)
//
// Reproducibility contract: running this script must produce an identical
// bundle every time — same bytes, same contentDigest, same signature. Any
// diff in the committed outputs after a rerun is a regression.
//
// Key material: a synthetic Ed25519 key derived from a fixed 32-byte seed.
// This key is PUBLIC by design; it exists only to demonstrate verification.
// Do NOT reuse it for anything real.

import { createHash, createPrivateKey, sign as edSign } from "node:crypto";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ed25519 } from "@noble/curves/ed25519.js";
import { zipSync, strToU8 } from "fflate";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_BUNDLE = join(HERE, "incident-demo.aarmos");
const OUT_UNPACKED = join(HERE, "unpacked");

// Fixed 32-byte seed — synthetic demo key, safe to publish.
const SEED_HEX = "a1a2a3a4a5a6a7a8a9aaabacadaeaf000102030405060708090a0b0c0d0e0f10";
const SEED = Buffer.from(SEED_HEX, "hex");

const WINDOW = { from: "2026-07-13T00:00:00.000Z", to: "2026-07-13T01:00:00.000Z" };
const TENANT = "acme-demo";
const WORKSPACE_ID = "ws:demo/incident-demo";
const CLI_VERSION = "0.10.0";
const BUNDLE_ID = "bnd_demo000000000000000000";

// ---------- synthetic content ----------

const receipts = [
  {
    id: "rcp_01", prev: null, ts: "2026-07-13T00:05:12.000Z",
    actor: { id: "agent:triage", role: "planner", kid: "kid_demo_0001" },
    action: { verb: "read", resource: "ticket", toolId: "zendesk.tickets.get", protocol: "openapi" },
    decision: "allow",
    policy: { hash: "sha256:policy0001", rulesetVersion: "1.0.0" },
    metering: { tokensIn: 812, tokensOut: 214, costUsd: 0.0031, durationMs: 420 },
    obligations: ["redact:pii"],
    sig: "demo_sig_01",
  },
  {
    id: "rcp_02", prev: "rcp_01", ts: "2026-07-13T00:06:03.000Z",
    actor: { id: "agent:triage", role: "planner", kid: "kid_demo_0001" },
    action: { verb: "communicate", resource: "ticket", toolId: "zendesk.tickets.reply", protocol: "openapi" },
    decision: "deny", denyReason: "policy:no-egress-outside-tenant",
    policy: { hash: "sha256:policy0001", rulesetVersion: "1.0.0" },
    metering: { tokensIn: 0, tokensOut: 0, costUsd: 0, durationMs: 12 },
    sig: "demo_sig_02",
  },
  {
    id: "rcp_03", prev: "rcp_02", ts: "2026-07-13T00:07:44.000Z",
    actor: { id: "agent:notifier", role: "worker", kid: "kid_demo_0002" },
    action: { verb: "communicate", resource: "chat", toolId: "slack.chat.postMessage", protocol: "openapi" },
    decision: "allow",
    policy: { hash: "sha256:policy0001", rulesetVersion: "1.0.0" },
    attenuation: { parentId: "rcp_01", grantId: "grant_ntf_9911" },
    metering: { tokensIn: 190, tokensOut: 44, costUsd: 0.0008, durationMs: 305 },
    sig: "demo_sig_03",
  },
];

const policyYaml = `# incident-demo synthetic policy — matches the receipts in this bundle.
schema: aarmos.policy/1
rulesetVersion: 1.0.0
rules:
  - id: no-egress-outside-tenant
    when: { action.verb: [communicate, transact], target.tenant: { not: acme-demo } }
    decision: deny
  - id: allow-read-ticket
    when: { action.verb: read, action.resource: ticket }
    decision: allow
  - id: allow-attenuated-notify
    when: { action.verb: communicate, action.toolId: slack.chat.postMessage, attenuation.parentId: { present: true } }
    decision: allow
`;

const matrixJson = {
  schema: "aarmos.matrix/1",
  actions: ["read", "write", "delete", "communicate", "transact", "execute", "control", "observe"],
  resources: ["file", "record", "ticket", "chat", "email", "payment", "process", "identity"],
  defaults: { decision: "deny" },
};

const egressRows = [
  { ts: "2026-07-13T00:05:12.100Z", toolId: "zendesk.tickets.get", protocol: "openapi",
    fqdn: "acme.zendesk.com", method: "GET", reqBytes: 412, respBytes: 5120, status: 200, receiptId: "rcp_01" },
  { ts: "2026-07-13T00:07:44.180Z", toolId: "slack.chat.postMessage", protocol: "openapi",
    fqdn: "slack.com", method: "POST", reqBytes: 640, respBytes: 220, status: 200, receiptId: "rcp_03" },
];

const guardrailRows = [
  { ts: "2026-07-13T00:06:03.010Z", kind: "deny-emitted", sessionId: "sess_demo_1",
    agentId: "agent:triage", action: "deny", observed: 1, limit: 0 },
];

// ---------- pack ----------

function sha256Hex(bytes) {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}
function b64url(bytes) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const pubRaw = ed25519.getPublicKey(SEED);   // 32 raw bytes

function toJsonl(rows) {
  return strToU8(rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
}
function toBytes(str) { return strToU8(str); }

const filesRaw = {
  "receipts/chain-0001.jsonl": toJsonl(receipts),
  "policies/policy-0001.yaml": toBytes(policyYaml),
  "policies/matrix.json":      toBytes(JSON.stringify(matrixJson, null, 2) + "\n"),
  "egress/ledger.jsonl":       toJsonl(egressRows),
  "guardrails/events.jsonl":   toJsonl(guardrailRows),
};

const REDACTION = {
  receipts: [
    "id", "prev", "ts",
    "actor.id", "actor.role", "actor.kid",
    "action.verb", "action.resource", "action.toolId", "action.protocol",
    "decision", "denyReason",
    "policy.hash", "policy.rulesetVersion",
    "attenuation.parentId", "attenuation.grantId",
    "metering.tokensIn", "metering.tokensOut", "metering.costUsd", "metering.durationMs",
    "obligations",
    "sig",
  ],
  egress: [
    "ts", "toolId", "protocol", "fqdn", "method",
    "reqBytes", "respBytes", "status",
    "receiptId", "unattributed",
  ],
  guardrails: [
    "ts", "kind", "sessionId", "agentId",
    "limit", "observed", "action",
  ],
};

// Build entries + contents block, sorted for reproducibility.
const entries = Object.entries(filesRaw)
  .map(([path, data]) => ({ path, data, sha256: `sha256:${sha256Hex(data)}`, bytes: data.byteLength }))
  .sort((a, b) => (a.path < b.path ? -1 : 1));

const contents = { receipts: [], policies: [], egress: [], guardrails: [] };
for (const e of entries) {
  const meta = { path: e.path, sha256: e.sha256, bytes: e.bytes };
  if (e.path.startsWith("receipts/")) contents.receipts.push(meta);
  else if (e.path.startsWith("policies/")) contents.policies.push(meta);
  else if (e.path.startsWith("egress/")) contents.egress.push(meta);
  else if (e.path.startsWith("guardrails/")) contents.guardrails.push(meta);
}

const digestInput = entries.map((e) => `${e.path}\t${e.sha256}`).join("\n");
const contentDigest = `sha256:${sha256Hex(strToU8(digestInput))}`;

const manifest = {
  schema: "aarmos.bundle/1",
  bundleId: BUNDLE_ID,
  workspace: {
    idHash: `sha256:${sha256Hex(strToU8(WORKSPACE_ID))}`,
    publicKey: { alg: "Ed25519", kid: "kid_demo_fixture_v1", key: b64url(pubRaw) },
  },
  tenant: TENANT,
  window: WINDOW,
  producer: { name: "aarmos-cli", version: CLI_VERSION },
  contents,
  contentDigest,
  redaction: {
    allowlist: "aarmos.bundle.v1",
    sha256: `sha256:${sha256Hex(strToU8(JSON.stringify(REDACTION)))}`,
  },
};

const manifestBytes = strToU8(JSON.stringify(manifest, null, 2) + "\n");
const sig = ed25519.sign(manifestBytes, SEED);      // 64-byte Ed25519 sig
const sigBytes = strToU8(b64url(sig) + "\n");

// Sanity: cross-verify with node:crypto so both verifier backends agree.
{
  const spkiPrefix = Uint8Array.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00]);
  const spki = new Uint8Array(spkiPrefix.length + pubRaw.length);
  spki.set(spkiPrefix, 0); spki.set(pubRaw, spkiPrefix.length);
  const { createPublicKey, verify } = await import("node:crypto");
  const key = createPublicKey({ key: Buffer.from(spki), format: "der", type: "spki" });
  const ok = verify(null, Buffer.from(manifestBytes), key, Buffer.from(sig));
  if (!ok) throw new Error("self-check: node:crypto rejected our own signature");
}

const filesAll = {
  ...filesRaw,
  "manifest.json": manifestBytes,
  "signatures/manifest.sig": sigBytes,
};

// Reproducible zip: fixed mtime.
const zipped = zipSync(filesAll, { mtime: new Date(Date.UTC(1980, 0, 1)) });

// Write bundle.
mkdirSync(HERE, { recursive: true });
writeFileSync(OUT_BUNDLE, zipped);

// Rewrite unpacked/ so it always mirrors the bundle exactly.
rmSync(OUT_UNPACKED, { recursive: true, force: true });
mkdirSync(OUT_UNPACKED, { recursive: true });
for (const [p, data] of Object.entries(filesAll)) {
  const abs = join(OUT_UNPACKED, p);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, Buffer.from(data));
}

console.log(`✓ wrote ${OUT_BUNDLE} (${zipped.byteLength} bytes)`);
console.log(`  bundleId       ${BUNDLE_ID}`);
console.log(`  contentDigest  ${contentDigest}`);
console.log(`  entries        ${entries.length}`);
console.log(`  unpacked       ${OUT_UNPACKED}`);
