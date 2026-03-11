/**
 * Block Type System
 *
 * Core type definitions for the HyprDoc block infrastructure.
 * Blocks are the building units of documents—each with edit/sign mode behavior.
 */

import type { z } from "zod";

// ════════════════════════════════════════════════════════════════════════════
// BLOCK MODE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Block rendering mode
 * - edit: template authoring, full controls
 * - sign: signer interaction on assigned fields
 * - view: read-only presentation
 */
export type BlockMode = "edit" | "sign" | "view";

// ════════════════════════════════════════════════════════════════════════════
// BLOCK CATEGORY
// ════════════════════════════════════════════════════════════════════════════

/**
 * Category for grouping blocks in the palette.
 * Dynamically fetched from Convex but typed for safety.
 */
export interface BlockCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
  description?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// BASE BLOCK PROPS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Common properties shared by ALL blocks.
 * These are stored as Tiptap node attributes.
 */
export interface BaseBlockAttrs {
  /** Unique block instance ID */
  id: string;

  /** Block type identifier (maps to definition) */
  blockType: string;

  /** Assigned party ID (signer assignment) */
  partyId: string | null;

  /** Is this field required for the signer? */
  required: boolean;

  /** Is this block conditionally visible? */
  conditional: boolean;

  /** Condition expression (evaluated at runtime) */
  conditionExpr: string | null;

  /** Block-specific data (JSON) */
  data: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════════════════════════
// BLOCK DEFINITION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Block definition - the single source of truth for a block type.
 * Combines metadata, schema, and component reference.
 */
export interface BlockDefinition<TData = unknown> {
  /** Unique block type identifier (e.g., "text-input", "signature") */
  type: string;

  /** Human-readable name for palette */
  name: string;

  /** Category ID for grouping */
  categoryId: string;

  /** Icon identifier (lucide icon class) */
  icon: string;

  /** Short description for palette tooltip */
  description: string;

  /** Can this block be assigned to a signer slot? */
  assignable: boolean;

  /** Zod schema for block-specific data validation */
  dataSchema: z.ZodType<TData>;

  /** Default values for new block instances */
  defaults: TData;

  /** Dynamic import for the Svelte component */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: () => Promise<{ default: any }>;
}

// ════════════════════════════════════════════════════════════════════════════
// BLOCK RENDER CONTEXT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Context passed to block components during rendering.
 */
export interface BlockRenderContext<TData = unknown> {
  /** Current rendering mode */
  mode: BlockMode;

  /** Block attributes from Tiptap node */
  attrs: BaseBlockAttrs;

  /** Typed block data */
  data: TData;

  /** Slot info if assigned */
  slot: {
    id: string;
    name: string;
    color: string;
  } | null;

  /** Update block data callback */
  updateData: (updates: Partial<TData>) => void;

  /** Update block attributes callback */
  updateAttrs: (updates: Partial<BaseBlockAttrs>) => void;

  /** Is the block selected in the editor? */
  selected: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// SLOT (ABSTRACT PARTY ASSIGNMENT)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Slot - abstract party placeholder in templates.
 * Maps to actual signers when envelope is created.
 */
export interface Slot {
  id: string;
  name: string;
  role: string;
  color: string;
  order: number;
}
