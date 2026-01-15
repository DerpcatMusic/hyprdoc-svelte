/**
 * globalVariables/types.ts - Type Definitions
 * ════════════════════════════════════════════════════════════════════════════
 */

import type { Id } from "@/convex/_generated/dataModel";

export type VariableType = "text" | "number" | "date" | "currency" | "boolean";
export type VariableScope = "system" | "user" | "document";
export type VariableFormat = "long" | "short" | "iso" | "words" | "uppercase" | "lowercase";

/**
 * Unified variable representation used across queries.
 */
export interface GlobalVariable {
	_id: string | Id<"globalVariables">;
	name: string;
	displayName?: string;
	value: string | number | boolean | null;
	type: VariableType;
	scope: VariableScope;
	category?: string;
	description?: string;
	placeholder?: string;
	fallback?: string;
	format?: VariableFormat;
	isRequired?: boolean;
	documentId?: Id<"documents">;
	workosId?: Id<"users">;
	createdAt?: number;
	updatedAt?: number;
}

/**
 * Format options for date/currency variables.
 */
export const FORMAT_OPTIONS: Record<VariableType, { value: string; label: string }[]> = {
	date: [
		{ value: "long", label: "January 14, 2026" },
		{ value: "short", label: "01/14/2026" },
		{ value: "iso", label: "2026-01-14" },
	],
	currency: [
		{ value: "long", label: "$50,000.00" },
		{ value: "words", label: "Fifty Thousand Dollars" },
	],
	text: [
		{ value: "uppercase", label: "UPPERCASE" },
		{ value: "lowercase", label: "lowercase" },
	],
	number: [],
	boolean: [],
};
