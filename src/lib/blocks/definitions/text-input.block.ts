/**
 * Text Input Block Definition
 *
 * Single-line text field for signer input.
 */

import { z } from "zod";
import type { BlockDefinition } from "$lib/blocks/types";

/** Zod schema for text input data */
export const textInputDataSchema = z.object({
  label: z.string().default("Enter text"),
  placeholder: z.string().default(""),
  value: z.string().default(""),
  maxLength: z.number().nullable().default(null),
  minLength: z.number().nullable().default(null),
});

export type TextInputData = z.infer<typeof textInputDataSchema>;

/** Block definition */
const textInputBlock: BlockDefinition<TextInputData> = {
  type: "text-input",
  name: "Text Input",
  categoryId: "input",
  icon: "i-lucide-text-cursor-input",
  description: "Single line text field",
  assignable: true,

  dataSchema: textInputDataSchema,

  defaults: {
    label: "Enter text",
    placeholder: "Type here...",
    value: "",
    maxLength: null,
    minLength: null,
  },

  component: () => import("$lib/blocks/components/TextInputBlock.svelte"),
};

export default textInputBlock;
