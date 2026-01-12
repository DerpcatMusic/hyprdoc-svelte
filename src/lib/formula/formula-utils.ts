/**
 * Formula Utilities
 *
 * Helper functions for formula blocks:
 * - Resolving block values
 * - Formatting results
 * - Building variable contexts
 */

import { type SmartBlockData, SmartBlockType } from "$lib/types";

// Block types that can provide numeric values for formulas
const NUMERIC_BLOCK_TYPES = new Set<SmartBlockType>([
  SmartBlockType.SMART_NUMBER,
  SmartBlockType.FORMULA,
  SmartBlockType.RATING,
]);

export type RoundingMode = "round" | "floor" | "ceil" | "truncate";

/**
 * Get the numeric value from a block
 */
export function resolveBlockValue(block: SmartBlockData): number | null {
  if (!block) { return null; }

  const value = block.value;

  // Handle null/undefined
  if (value === null || value === undefined) {
    return null;
  }

  // Handle numeric values
  if (typeof value === "number") {
    return value;
  }

  // Handle string numbers
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Get all blocks that can be referenced in formulas
 */
export function getNumericBlocks(
  blocks: Record<string, SmartBlockData>,
  excludeId?: string
): SmartBlockData[] {
  return Object.values(blocks).filter(
    (b) => NUMERIC_BLOCK_TYPES.has(b.type as SmartBlockType) && b.id !== excludeId
  );
}

/**
 * Build a variable context from all blocks in the document
 * Maps both block IDs and variable names to their values
 */
export function buildVariableContext(
  blocks: Record<string, SmartBlockData>
): Record<string, number> {
  const context: Record<string, number> = {};

  for (const block of Object.values(blocks)) {
    const value = resolveBlockValue(block);
    if (value !== null) {
      // Map by variable name (primary)
      if (block.variableName) {
        context[block.variableName] = value;
      }
      // Also map by ID (fallback)
      context[block.id] = value;
      // Also map by label (user-friendly)
      if (block.label) {
        context[block.label] = value;
      }
    }
  }

  return context;
}

/**
 * Format a number according to settings
 */
export function formatResult(
  value: number,
  options: {
    decimals?: number;
    roundingMode?: RoundingMode;
    prefix?: string;
    suffix?: string;
  } = {}
): string {
  const { decimals = 2, roundingMode = "round", prefix = "", suffix = "" } = options;

  // Apply rounding
  let rounded: number;
  const factor = 10 ** decimals;

  switch (roundingMode) {
    case "floor": {
      rounded = Math.floor(value * factor) / factor;
      break;
    }
    case "ceil": {
      rounded = Math.ceil(value * factor) / factor;
      break;
    }
    case "truncate": {
      rounded = Math.trunc(value * factor) / factor;
      break;
    }
    default: {
      rounded = Math.round(value * factor) / factor;
    }
  }

  // Format with fixed decimals
  const formatted = rounded.toFixed(decimals);

  return `${prefix}${formatted}${suffix}`;
}

/**
 * Get dependency information for a formula
 */
export function getFormulaDependencies(
  expression: string,
  blocks: Record<string, SmartBlockData>
): { resolved: SmartBlockData[]; missing: string[] } {
  // Extract variable references
  const matches = expression.match(/{{([^}]+)}}/g) || [];
  const varNames = matches.map((m) => m.slice(2, -2).trim());

  const resolved: SmartBlockData[] = [];
  const missing: string[] = [];

  for (const varName of varNames) {
    // Try to find by variable name, ID, or label
    const block = Object.values(blocks).find(
      (b) => b.variableName === varName || b.id === varName || b.label === varName
    );

    if (block) {
      if (!resolved.find((r) => r.id === block.id)) {
        resolved.push(block);
      }
    } else if (!missing.includes(varName)) {
        missing.push(varName);
      }
  }

  return { resolved, missing };
}

/**
 * Insert a variable reference at cursor position
 */
export function insertVariableRef(
  expression: string,
  variableName: string,
  cursorPosition: number
): { expression: string; newCursorPosition: number } {
  const ref = `{{${variableName}}}`;
  const before = expression.slice(0, cursorPosition);
  const after = expression.slice(cursorPosition);

  return {
    expression: before + ref + after,
    newCursorPosition: cursorPosition + ref.length,
  };
}

/**
 * Insert a function call at cursor position
 */
export function insertFunctionCall(
  expression: string,
  functionName: string,
  cursorPosition: number
): { expression: string; newCursorPosition: number } {
  const call = `${functionName}()`;
  const before = expression.slice(0, cursorPosition);
  const after = expression.slice(cursorPosition);

  return {
    expression: before + call + after,
    // Position cursor inside the parentheses
    newCursorPosition: cursorPosition + functionName.length + 1,
  };
}
