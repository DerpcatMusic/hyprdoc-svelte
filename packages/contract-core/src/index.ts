import type { BlockLineageLink } from "@hyprdoc/domain-types";

function stableSerialize(input: unknown): string {
  if (input === null || typeof input !== "object") return JSON.stringify(input);
  if (Array.isArray(input)) return `[${input.map((x) => stableSerialize(x)).join(",")}]`;

  const entries = Object.entries(input as Record<string, unknown>)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableSerialize(v)}`)
    .join(",")}}`;
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashLineage(input: Omit<BlockLineageLink, "hash">): Promise<string> {
  const canonical = stableSerialize(input);
  return sha256Hex(canonical);
}

export { stableSerialize };