/**
 * Live Value Block Definition
 *
 * Read-only runtime field for post-seal operational updates.
 * This block is intended for integration-driven values and live contract state,
 * not signer-entered input.
 */

import { z } from "zod";
import type { BlockDefinition } from "$lib/blocks/types";

export const liveValueDataSchema = z.object({
  label: z.string().default("Live value"),
  placeholder: z.string().default("Waiting for runtime data"),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).default(null),
  format: z.enum(["text", "status", "currency"]).default("text"),
  currencyCode: z.string().default("USD"),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
});

export type LiveValueData = z.infer<typeof liveValueDataSchema>;

const liveValueBlock: BlockDefinition<LiveValueData> = {
  type: "live-value",
  name: "Live Value",
  categoryId: "live",
  icon: "i-lucide-activity",
  description: "Runtime-fed value that can update after seal",
  assignable: false,

  dataSchema: liveValueDataSchema,

  defaults: {
    label: "Live value",
    placeholder: "Waiting for runtime data",
    value: null,
    format: "text",
    currencyCode: "USD",
    prefix: "",
    suffix: "",
  },

  runtimeDefaults: {
    mode: "live_replaceable",
    allowedPaths: ["data.value"],
  },

  integrationDefaults: null,

  component: () => import("$lib/blocks/components/LiveValueBlock.svelte"),
};

export default liveValueBlock;
