/**
 * globalVariables/constants.ts - Pre-built System Variables
 * ════════════════════════════════════════════════════════════════════════════
 * These are always available and auto-populate based on context.
 * Perfect for contract builders who need consistent data across documents.
 */

import type { VariableType } from "./types.js";

// ════════════════════════════════════════════════════════════════════════════
// SYSTEM VARIABLE DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

export interface SystemVariable {
	name: string;
	displayName: string;
	type: VariableType;
	category: string;
	description: string;
	example: string;
	formats?: string[]; // Available format variants
}

/**
 * Pre-built system variables that are always available.
 * These auto-populate based on context (document, user, signers).
 */
export const SYSTEM_VARIABLES: SystemVariable[] = [
	// ━━━ DATE & TIME ━━━
	{
		name: "today",
		displayName: "Today's Date",
		type: "date",
		category: "Dates",
		description: "Current date, auto-updates",
		example: "January 14, 2026",
		formats: ["long", "short", "iso"],
	},
	{
		name: "now",
		displayName: "Current Time",
		type: "text",
		category: "Dates",
		description: "Current date and time",
		example: "January 14, 2026 at 3:14 PM",
	},
	{
		name: "current_year",
		displayName: "Current Year",
		type: "text",
		category: "Dates",
		description: "Current year number",
		example: "2026",
	},
	{
		name: "current_month",
		displayName: "Current Month",
		type: "text",
		category: "Dates",
		description: "Current month name",
		example: "January",
	},

	// ━━━ DOCUMENT METADATA ━━━
	{
		name: "document_title",
		displayName: "Document Title",
		type: "text",
		category: "Document",
		description: "Title of this document",
		example: "Service Agreement",
	},
	{
		name: "document_created",
		displayName: "Document Created",
		type: "date",
		category: "Document",
		description: "When this document was created",
		example: "January 10, 2026",
		formats: ["long", "short", "iso"],
	},
	{
		name: "document_id",
		displayName: "Document ID",
		type: "text",
		category: "Document",
		description: "Unique document identifier",
		example: "DOC-2026-0142",
	},

	// ━━━ SIGNER CONTEXT ━━━
	{
		name: "signer_name",
		displayName: "Current Signer Name",
		type: "text",
		category: "Signer",
		description: "Name of the person currently signing",
		example: "John Smith",
	},
	{
		name: "signer_email",
		displayName: "Current Signer Email",
		type: "text",
		category: "Signer",
		description: "Email of the person currently signing",
		example: "john@example.com",
	},
	{
		name: "signer_role",
		displayName: "Current Signer Role",
		type: "text",
		category: "Signer",
		description: "Role/title of the person currently signing",
		example: "CEO",
	},
];

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT USER VARIABLES (Template for new users)
// ════════════════════════════════════════════════════════════════════════════

export interface DefaultUserVariable {
	name: string;
	displayName: string;
	type: VariableType;
	category: string;
	description: string;
	placeholder: string;
	isRequired?: boolean;
}

/**
 * Variables created for new users during onboarding.
 * These persist across all their documents.
 */
export const DEFAULT_USER_VARIABLES: DefaultUserVariable[] = [
	// ━━━ COMPANY INFO ━━━
	{
		name: "company_name",
		displayName: "Company Name",
		type: "text",
		category: "Company",
		description: "Your company's legal name",
		placeholder: "Acme Corporation Inc.",
		isRequired: true,
	},
	{
		name: "company_address",
		displayName: "Company Address",
		type: "text",
		category: "Company",
		description: "Primary business address",
		placeholder: "123 Business St, Suite 100, City, State 12345",
	},
	{
		name: "company_email",
		displayName: "Company Email",
		type: "text",
		category: "Company",
		description: "Official contact email",
		placeholder: "contact@company.com",
	},
	{
		name: "company_phone",
		displayName: "Company Phone",
		type: "text",
		category: "Company",
		description: "Main phone number",
		placeholder: "(555) 123-4567",
	},
	{
		name: "company_registration",
		displayName: "Registration Number",
		type: "text",
		category: "Company",
		description: "Business registration/incorporation number",
		placeholder: "LLC #12345678",
	},
	{
		name: "tax_id",
		displayName: "Tax ID / EIN",
		type: "text",
		category: "Company",
		description: "Tax identification number",
		placeholder: "XX-XXXXXXX",
	},

	// ━━━ MY INFO (Auto-fills from profile) ━━━
	{
		name: "my_name",
		displayName: "My Full Name",
		type: "text",
		category: "Personal",
		description: "Your full legal name",
		placeholder: "John Smith",
		isRequired: true,
	},
	{
		name: "my_email",
		displayName: "My Email",
		type: "text",
		category: "Personal",
		description: "Your email address",
		placeholder: "john@example.com",
	},
	{
		name: "my_title",
		displayName: "My Title",
		type: "text",
		category: "Personal",
		description: "Your job title/position",
		placeholder: "CEO",
	},
];

// ════════════════════════════════════════════════════════════════════════════
// COMMON CONTRACT VARIABLES (Suggested for documents)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Frequently used document-scoped variables.
 * Suggested when creating new contracts.
 */
export const COMMON_CONTRACT_VARIABLES: DefaultUserVariable[] = [
	// ━━━ PARTIES ━━━
	{
		name: "party_a_name",
		displayName: "Party A (Client) Name",
		type: "text",
		category: "Parties",
		description: "The other party's company/individual name",
		placeholder: "Client Company Inc.",
		isRequired: true,
	},
	{
		name: "party_a_address",
		displayName: "Party A Address",
		type: "text",
		category: "Parties",
		description: "The other party's address",
		placeholder: "456 Client Ave, City, State 12345",
	},
	{
		name: "party_a_signer",
		displayName: "Party A Signer Name",
		type: "text",
		category: "Parties",
		description: "Person signing for Party A",
		placeholder: "Jane Doe",
	},
	{
		name: "party_a_title",
		displayName: "Party A Signer Title",
		type: "text",
		category: "Parties",
		description: "Title of Party A signer",
		placeholder: "Director",
	},

	// ━━━ CONTRACT TERMS ━━━
	{
		name: "effective_date",
		displayName: "Effective Date",
		type: "date",
		category: "Terms",
		description: "When the contract takes effect",
		placeholder: "January 1, 2026",
		isRequired: true,
	},
	{
		name: "expiration_date",
		displayName: "Expiration Date",
		type: "date",
		category: "Terms",
		description: "When the contract ends",
		placeholder: "December 31, 2026",
	},
	{
		name: "contract_value",
		displayName: "Contract Value",
		type: "currency",
		category: "Financial",
		description: "Total contract amount",
		placeholder: "$50,000.00",
	},
	{
		name: "payment_terms",
		displayName: "Payment Terms",
		type: "text",
		category: "Financial",
		description: "Payment schedule/terms",
		placeholder: "Net 30",
	},
	{
		name: "governing_law",
		displayName: "Governing Law",
		type: "text",
		category: "Legal",
		description: "Jurisdiction for disputes",
		placeholder: "State of California",
	},
];

// ════════════════════════════════════════════════════════════════════════════
// VARIABLE CATEGORIES (for UI grouping)
// ════════════════════════════════════════════════════════════════════════════

export const VARIABLE_CATEGORIES = [
	{ id: "Dates", icon: "i-lucide-calendar", color: "text-amber-500" },
	{ id: "Document", icon: "i-lucide-file-text", color: "text-blue-500" },
	{ id: "Signer", icon: "i-lucide-pen-tool", color: "text-purple-500" },
	{ id: "Company", icon: "i-lucide-building-2", color: "text-emerald-500" },
	{ id: "Personal", icon: "i-lucide-user", color: "text-pink-500" },
	{ id: "Parties", icon: "i-lucide-users", color: "text-indigo-500" },
	{ id: "Terms", icon: "i-lucide-scale", color: "text-orange-500" },
	{ id: "Financial", icon: "i-lucide-banknote", color: "text-green-500" },
	{ id: "Legal", icon: "i-lucide-gavel", color: "text-red-500" },
	{ id: "Custom", icon: "i-lucide-sparkles", color: "text-cyan-500" },
] as const;

export type VariableCategory = (typeof VARIABLE_CATEGORIES)[number]["id"];
