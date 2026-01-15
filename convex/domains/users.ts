/**
 * domains/users.ts - Users Domain
 * ═══════════════════════════════════════════════════════════════
 * Single source of truth for user data.
 */

import { z } from "zod";
import { v } from "convex/values";

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
  subscriptionStatus: z.enum(["active", "past_due", "canceled", "trialing"]).optional(),
  
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

// ═══════════════════════════════════════════════════════════════
// CONVEX VALIDATOR (for schema.ts defineTable)
// ═══════════════════════════════════════════════════════════════

export const userValidator = v.object({
  workosId: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  tierId: v.optional(v.string()),
  polarCustomerId: v.optional(v.string()),
  polarSubscriptionId: v.optional(v.string()),
  subscriptionStatus: v.optional(v.string()),
  brandLogoUrl: v.optional(v.string()),
  brandLogoPosition: v.optional(v.string()),
  clockEnabled: v.optional(v.boolean()),
  clockSize: v.optional(v.string()),
  clockPosition: v.optional(v.string()),
  corporateModeEnabled: v.optional(v.boolean()),
  tosAcceptedAt: v.optional(v.number()),
  tosVersion: v.optional(v.string()),
  defaultPaperTexture: v.optional(v.string()),
  defaultPaperTextureOpacity: v.optional(v.number()),
  defaultShowMargins: v.optional(v.boolean()),
  defaultMarginVertical: v.optional(v.number()),
  defaultMarginHorizontal: v.optional(v.number()),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
});
