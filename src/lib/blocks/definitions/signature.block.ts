/**
 * Signature Block Definition
 *
 * Signature capture field for signers.
 */

import { z } from "zod";
import type { BlockDefinition } from "$lib/blocks/types";

/** Zod schema for signature data */
export const signatureDataSchema = z.object({
  label: z.string().default("Signature"),
  signatureData: z.string().nullable().default(null), // Base64 SVG/PNG
  signedAt: z.string().nullable().default(null),
  signerName: z.string().nullable().default(null),
  liveMode: z.literal("sealed").default("sealed"),
  livePaths: z.array(z.string()).default([]),
});

export type SignatureData = z.infer<typeof signatureDataSchema>;

/** Block definition */
const signatureBlock: BlockDefinition<SignatureData> = {
  type: "signature",
  name: "Signature",
  categoryId: "signature",
  icon: "i-lucide-pen-tool",
  description: "Signature capture field",
  assignable: true,

  dataSchema: signatureDataSchema,

  defaults: {
    label: "Signature",
    signatureData: null,
    signedAt: null,
    signerName: null,
    liveMode: "sealed",
    livePaths: [],
  },

  component: () => import("$lib/blocks/components/SignatureBlock.svelte"),
};

export default signatureBlock;
