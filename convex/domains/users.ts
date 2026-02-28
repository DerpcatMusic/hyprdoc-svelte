import { z } from "../lib/core";

// ═══════════════════════════════════════════════════════════════
// ZOD SCHEMA — SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════

export const UserSchema = z.object({
  // Core identity
  workosId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  imageUrl: z.string().url().optional(),
  
  // Subscription
  tierId: z.enum(["free", "basic", "pro", "enterprise"]).default("free"),
  polarCustomerId: z.string().optional(),
  polarSubscriptionId: z.string().optional(),
  subscriptionStatus: z.enum(["active", "past_due", "canceled", "trialing", "incomplete", "none"]).optional(),
  
  // Branding
  brandLogoUrl: z.string().optional(),
  brandLogoPosition: z.enum(["left", "center", "right"]).optional(),
  clockEnabled: z.boolean().optional(),
  clockSize: z.string().optional(),
  clockPosition: z.enum(["left", "center", "right"]).optional(),
  corporateModeEnabled: z.boolean().optional(),
  
  // Terms
  tosAcceptedAt: z.number().optional(),
  tosVersion: z.string().optional(),
  
  // Defaults
  defaultPaperTexture: z.string().optional(),
  defaultPaperTextureOpacity: z.number().optional(),
  defaultShowMargins: z.boolean().optional(),
  defaultMarginVertical: z.number().optional(),
  defaultMarginHorizontal: z.number().optional(),
  
  // Meta
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
});

// ═══════════════════════════════════════════════════════════════
// DERIVED TYPES
// ═══════════════════════════════════════════════════════════════

export type User = z.infer<typeof UserSchema>;
