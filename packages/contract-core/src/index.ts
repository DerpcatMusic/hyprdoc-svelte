import type { BlockLineageLink } from "@hyprdoc/domain-types";

export interface SealHashInput {
  title: string;
  content: string;
  blocks: unknown;
  settings: unknown;
}

type HyprproofModule = typeof import("./wasm/hyprproof_core.js");
let hyprproofModulePromise: Promise<HyprproofModule> | null = null;

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

async function loadHyprproofModule(): Promise<HyprproofModule> {
  if (!hyprproofModulePromise) {
    hyprproofModulePromise = import("./wasm/hyprproof_core.js").then(
      async (module) => {
        await module.default();
        return module;
      }
    );
  }

  return hyprproofModulePromise;
}

export async function computeSealHash(input: SealHashInput): Promise<string> {
  const module = await loadHyprproofModule();

  return module.compute_seal_hash_json(
    JSON.stringify({
      title: input.title,
      content: input.content,
      blocks: input.blocks,
      settings: input.settings,
    })
  );
}

export async function verifySealHash(
  input: SealHashInput,
  expectedHash: string
): Promise<{ computedHash: string; matches: boolean }> {
  const computedHash = await computeSealHash(input);

  return {
    computedHash,
    matches: computedHash === expectedHash,
  };
}

export async function hashLineage(input: Omit<BlockLineageLink, "hash">): Promise<string> {
  const canonical = stableSerialize(input);
  return sha256Hex(canonical);
}

export { stableSerialize };
