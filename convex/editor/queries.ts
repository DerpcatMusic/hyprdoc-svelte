/**
 * editor/queries.ts - Editor Data Query
 * Combined query for all editor data - reduces WebSocket roundtrips.
 */
import { type Infer, v } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel";
import type { QueryCtx } from "@/convex/_generated/server";
import { query, protectedQuery } from "@/convex/lib/core";
import type { documentReturnValidator } from "../lib/validators";

// ═══════════════════════════════════════════════════════════════
// GLOBAL VARIABLES HELPER
// ═══════════════════════════════════════════════════════════════

interface GlobalVariable {
	_id: Id<"globalVariables"> | string;
	name: string;
	displayName?: string;
	value: string | number | boolean | null;
	type: "text" | "number" | "date" | "currency" | "boolean";
	category?: string;
	scope: "system" | "user" | "document";
	fallback?: string;
	createdAt: number;
	updatedAt: number;
}

const SYSTEM_VARIABLES = [
	{ name: "today", displayName: "Today's Date", type: "date" as const, category: "Date" },
	{ name: "now", displayName: "Current Time", type: "text" as const, category: "Date" },
	{ name: "document_title", displayName: "Document Title", type: "text" as const, category: "Document" },
	{ name: "document_created", displayName: "Document Created", type: "date" as const, category: "Document" },
	{ name: "signer_name", displayName: "Signer Name", type: "text" as const, category: "Signer" },
	{ name: "signer_email", displayName: "Signer Email", type: "text" as const, category: "Signer" },
	{ name: "signer_role", displayName: "Signer Role", type: "text" as const, category: "Signer" },
];

async function getGlobalVariablesForDocument(
	ctx: QueryCtx,
	userId: Id<"users"> | undefined,
	documentId?: Id<"documents">,
): Promise<GlobalVariable[]> {
	// System variables
	const systemVars: GlobalVariable[] = SYSTEM_VARIABLES.map((sv) => ({
		_id: `system_${sv.name}`,
		...sv,
		value: null,
		scope: "system" as const,
		fallback: "",
		createdAt: 0,
		updatedAt: 0,
	}));

	// User variables
	let userVars: GlobalVariable[] = [];
	if (userId) {
		const userVariables = await ctx.db
			.query("globalVariables")
			.withIndex("by_user", (q) => q.eq("workosId", userId))
			.collect();

		userVars = userVariables
			.filter((v) => v.scope === "user")
			.map((v) => ({ ...v, value: v.value ?? null }) as GlobalVariable);
	}

	// Document variables
	let docVars: GlobalVariable[] = [];
	if (documentId) {
		const docVariables = await ctx.db
			.query("globalVariables")
			.withIndex("by_document", (q) => q.eq("documentId", documentId))
			.collect();

		docVars = docVariables
			.filter((v) => v.scope === "document")
			.map((v) => ({ ...v, value: v.value ?? null }) as GlobalVariable);
	}

	// Merge with precedence: document > user > system
	const variableMap = new Map<string, GlobalVariable>();
	for (const v of systemVars) variableMap.set(v.name, v);
	for (const v of userVars) variableMap.set(v.name, v);
	for (const v of docVars) variableMap.set(v.name, v);

	return [...variableMap.values()];
}

// ═══════════════════════════════════════════════════════════════
// EDITOR DATA QUERY
// ═══════════════════════════════════════════════════════════════

/**
 * Combined query for all editor data.
 * Fetches document, glossary terms, and global variables in one roundtrip.
 */
export const getEditorData = query({
	args: {
		documentId: v.optional(v.id("documents")),
		templateId: v.optional(v.id("documents")),
	},
	handler: async (ctx, args) => {
		if (!(args.documentId || args.templateId)) {
			return null;
		}

		let document: Infer<typeof documentReturnValidator> | null = null;
		let template: Infer<typeof documentReturnValidator> | null = null;

		// Fetch document (RLS handles access control)
		if (args.documentId) {
			const doc = await ctx.db.get(args.documentId);
			if (!doc) return null;
			
			// Check ownership or public access
			if (!doc.isPublic && doc.ownerId !== ctx.user?._id) {
				return null;
			}
			document = doc;
		}

		// Fetch template (public templates are accessible)
		if (args.templateId) {
			template = await ctx.db.get(args.templateId);
		}

		// Parallel fetch all related data
		const [glossaryTermsRaw, globalVariables] = await Promise.all([
			ctx.db.query("glossaryTerms").take(2000),
			getGlobalVariablesForDocument(ctx, ctx.user?._id, args.documentId),
		]);

		const glossaryTerms = glossaryTermsRaw.map((t) => t.term);

		return {
			document,
			template,
			signers: [],
			glossaryTerms,
			globalVariables,
		};
	},
});
