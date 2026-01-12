/**
 * Standardized hashing utility for signatures and timestamps.
 * Uses SHA-256 via the subtle crypto API.
 */
export const generateHash = async (data: string): Promise<string> => {
  try {
    const msgBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = [...new Uint8Array(hashBuffer)];
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    console.error("Hashing failed", error);
    return `hash_error_${Date.now()}`;
  }
};

export const formatShortHash = (hash: string) => {
  if (!hash) { return ""; }
  return `${hash.slice(0, 4)}...${hash.slice(Math.max(0, hash.length - 4))}`;
};

/**
 * Seals the document by hashing its entire state.
 * This represents the "Digital Seal" of the envelope at the moment of signing.
 */
export const sealDocument = async (
  blocks: Record<string, any>,
  settings: any,
  slots: any[]
): Promise<string> => {
  // 1. Sort blocks by ID to ensure deterministic ordering regardless of insertion order
  const sortedBlockKeys = Object.keys(blocks).sort();
  const sortedBlocks = sortedBlockKeys.map((key) => blocks[key]);

  // 2. Create the canonical payload
  const payload = JSON.stringify({
    header: {
      algorithm: "SHA-256",
      type: "HyprDoc_Envelope_v1",
      sealedAt: new Date().toISOString(),
    },
    content: {
      settings,
      slots,
      blocks: sortedBlocks,
    },
  });

  // 3. Generate Hash
  return generateHash(payload);
};
