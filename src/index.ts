/**
 * @aarmos/bundle-schema — frozen types for aarmos.bundle/1.
 *
 * The JSON Schemas under ./schemas are the source of truth. These TS
 * types mirror them for producer/consumer ergonomics. Any change to a
 * schema MUST be reflected here (and vice versa) or the schema tests fail.
 */

export const BUNDLE_SCHEMA_ID = "aarmos.bundle/1" as const;
export const REDACTION_ALLOWLIST_ID = "aarmos.bundle.v1" as const;
export const CONTAINER_FORMAT = "zip" as const;

export type Sha256 = `sha256:${string}`;

export interface BundleFileEntry {
  path: string;
  sha256: Sha256;
  bytes: number;
}

export interface BundleAnchorEntry {
  path: "anchor.json";
  sha256: Sha256;
}

export interface BundleManifest {
  schema: typeof BUNDLE_SCHEMA_ID;
  bundleId: string;
  workspace: {
    idHash: Sha256;
    publicKey: { alg: "Ed25519"; kid: string; key: string };
  };
  tenant: string;
  window: { from: string; to: string };
  producer: { name: "aarmos-cli"; version: string };
  narrowing?: { sessionIds?: string[]; agentIds?: string[] };
  contents: {
    receipts: BundleFileEntry[];
    policies: BundleFileEntry[];
    egress: BundleFileEntry[];
    guardrails: BundleFileEntry[];
    /** Phase 2D — Scoped Tool Invites and their redemption records. */
    invites?: BundleFileEntry[];
    anchor?: BundleAnchorEntry;
  };
  contentDigest: Sha256;
  redaction?: {
    allowlist: typeof REDACTION_ALLOWLIST_ID;
    sha256: Sha256;
  };
}

export interface BundleAnchor {
  log: "rekor";
  logId: string;
  logIndex: number;
  integratedTime: number;
  digest: Sha256;
  inclusionProof: {
    logIndex: number;
    treeSize: number;
    rootHash: string;
    hashes: string[];
    body: string;
  };
}

/**
 * Phase 2D — record of a single invite redemption. Bundle verifiers
 * cross-check that every redemption references an invite in `invites/`
 * and that every AVAR receipt tagged `via_invite` links back here.
 */
export interface InviteRedemption {
  inviteId: string;
  redeemer: string;
  ts: string;
  action: string;
  resource: string;
  /** AVAR entry id that recorded this redemption. */
  receiptId: string;
  /** Nonce derived from the invite; enforces max_uses over a bundle. */
  redemptionNonce: string;
}

/**
 * Canonical paths inside a .aarmos zip. Ordering matters for
 * contentDigest reproducibility — see docs/roadmap/moat-layers.md §0.
 */
export const BUNDLE_PATHS = {
  manifest: "manifest.json",
  anchor: "anchor.json",
  signatureManifest: "signatures/manifest.sig",
  receiptsDir: "receipts/",
  policiesDir: "policies/",
  egressDir: "egress/",
  guardrailsDir: "guardrails/",
  invitesDir: "invites/",
  invitesIssued: "invites/issued.jsonl",
  invitesRedemptions: "invites/redemptions.jsonl",
  invitesRevoked: "invites/revoked.jsonl",
} as const;
