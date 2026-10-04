/**
 * Hash-chain Audit Trail
 * Ported from Python spec - SHA-256 chain over canonical JSON payloads.
 *
 * No blockchain needed; append-only storage + verifiable chain.
 */

import { createHash } from "crypto";

export function recordHash(
  payload: Record<string, unknown>,
  prevHash: string | null
): string {
  const canonical = JSON.stringify(
    payload,
    Object.keys(payload).sort() as (keyof typeof payload)[] as never,
    // sort keys
  ) // sort_keys equivalent - use stable stringify
    // fallback: stringify with sorted keys (manual)
    .replace(/\s+/g, "");

  // Use canonical stringify to ensure stable ordering
  const stable = stableStringify(payload);
  return createHash("sha256")
    .update(`${prevHash ?? "GENESIS"}|${stable}`)
    .digest("hex");
}

export interface ChainRecord {
  id?: string;
  payload: Record<string, unknown>;
  prevHash: string | null;
  recordHash: string;
}

export interface VerifyResult {
  valid: boolean;
  brokenAtIndex?: number;
  recordId?: string;
  verifiedRecords?: number;
}

export function verifyChain(records: ChainRecord[]): VerifyResult {
  let prev: string | null = null;
  for (let idx = 0; idx < records.length; idx++) {
    const rec = records[idx];
    const expected = recordHash(rec.payload, prev);
    if (expected !== rec.recordHash) {
      return {
        valid: false,
        brokenAtIndex: idx,
        recordId: rec.id,
      };
    }
    prev = rec.recordHash;
  }
  return { valid: true, verifiedRecords: records.length };
}

/**
 * Stable JSON stringify - keys sorted alphabetically, compact separators,
 * UTF-8 preserved. Mirrors Python json.dumps(sort_keys=True, separators=(",",":")).
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(stabilize(value));
}

function stabilize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stabilize);
  if (value && typeof value === "object" && !isDate(value)) {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = stabilize(obj[key]);
    }
    return out;
  }
  return value;
}

function isDate(v: unknown): v is Date {
  return v instanceof Date;
}
