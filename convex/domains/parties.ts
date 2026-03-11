/**
 * domains/parties.ts - Document Parties Domain
 * ═══════════════════════════════════════════════════════════════
 * Zod schemas and utilities for document parties (signers).
 */

import { z } from "../lib/core";

export const DocumentPartySchema = z.object({
  id: z.string(), // Standard UUID
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), // Strict hex
  email: z.string().email().or(z.literal("")).nullable().optional(),
  phone: z.string().or(z.literal("")).nullable().optional(),
  title: z.string().or(z.literal("")).nullable().optional(),
  company: z.string().or(z.literal("")).nullable().optional(),
});

export type DocumentParty = z.infer<typeof DocumentPartySchema>;
