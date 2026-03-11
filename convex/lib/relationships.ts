/**
 * lib/relationships.ts - Relationship Helpers
 * ════════════════════════════════════════════════════════════════════════════
 * Reusable data fetching patterns for related documents.
 * Uses standard Convex queries with parallel fetching for performance.
 */

import type { QueryCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENT RELATIONSHIPS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get document with all related signers and slots.
 * Fetches in parallel for performance.
 */
export async function getDocumentWithRelations(
	ctx: QueryCtx,
	documentId: Id<"documents">,
): Promise<{
	document: Doc<"documents"> | null;
	signers: Doc<"signers">[];
	slots: Doc<"slots">[];
	signatures: Doc<"signatures">[];
} | null> {
	const document = await ctx.db.get(documentId);
	if (!document) return null;

	const [signers, slots, signatures] = await Promise.all([
		ctx.db
			.query("signers")
			.withIndex("by_document", (q) => q.eq("documentId", documentId))
			.collect(),
		ctx.db
			.query("slots")
			.withIndex("by_document", (q) => q.eq("documentId", documentId))
			.collect(),
		ctx.db
			.query("signatures")
			.withIndex("by_document", (q) => q.eq("documentId", documentId))
			.collect(),
	]);

	return { document, signers, slots, signatures };
}

/**
 * Get document with its versions.
 */
export async function getDocumentWithVersions(
	ctx: QueryCtx,
	documentId: Id<"documents">,
): Promise<{
	document: Doc<"documents"> | null;
	versions: Doc<"documentVersions">[];
} | null> {
	const document = await ctx.db.get(documentId);
	if (!document) return null;

	const versions = await ctx.db
		.query("documentVersions")
		.withIndex("by_document", (q) => q.eq("documentId", documentId))
		.collect();

	return { document, versions };
}

/**
 * Get document with pending changes (track changes).
 */
export async function getDocumentWithChanges(
	ctx: QueryCtx,
	documentId: Id<"documents">,
): Promise<{
	document: Doc<"documents"> | null;
	changes: Doc<"documentChanges">[];
} | null> {
	const document = await ctx.db.get(documentId);
	if (!document) return null;

	const changes = await ctx.db
		.query("documentChanges")
		.withIndex("by_document", (q) => q.eq("documentId", documentId))
		.collect();

	return { document, changes };
}

// ════════════════════════════════════════════════════════════════════════════
// SIGNER RELATIONSHIPS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get signer with their document.
 */
export async function getSignerWithDocument(
	ctx: QueryCtx,
	signerId: Id<"signers">,
): Promise<{ signer: Doc<"signers">; document: Doc<"documents"> } | null> {
	const signer = await ctx.db.get(signerId);
	if (!signer) return null;

	const document = await ctx.db.get(signer.documentId);
	if (!document) return null;

	return { signer, document };
}

/**
 * Get signer with their signatures.
 */
export async function getSignerWithSignatures(
	ctx: QueryCtx,
	signerId: Id<"signers">,
): Promise<{
	signer: Doc<"signers"> | null;
	signatures: Doc<"signatures">[];
} | null> {
	const signer = await ctx.db.get(signerId);
	if (!signer) return null;

	const signatures = await ctx.db
		.query("signatures")
		.withIndex("by_signer", (q) => q.eq("signerId", signerId))
		.collect();

	return { signer, signatures };
}

// ════════════════════════════════════════════════════════════════════════════
// USER RELATIONSHIPS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get user's documents (owned).
 */
export async function getUserDocuments(
	ctx: QueryCtx,
	userId: Id<"users">,
): Promise<Doc<"documents">[]> {
	return ctx.db
		.query("documents")
		.withIndex("by_owner", (q) => q.eq("ownerId", userId))
		.collect();
}

/**
 * Get user's glossary terms.
 */
export async function getUserGlossaryTerms(
	ctx: QueryCtx,
	userId: Id<"users">,
): Promise<Doc<"glossaryTerms">[]> {
	return ctx.db
		.query("glossaryTerms")
		.withIndex("by_user", (q) => q.eq("workosId", userId))
		.collect();
}

// ════════════════════════════════════════════════════════════════════════════
// TEMPLATE RELATIONSHIPS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get template with all instances (envelopes created from it).
 */
export async function getTemplateWithInstances(
	ctx: QueryCtx,
	templateId: Id<"documents">,
): Promise<{
	template: Doc<"documents"> | null;
	instances: Doc<"documents">[];
} | null> {
	const template = await ctx.db.get(templateId);
	if (!template || template.kind !== "template") return null;

	const instances = await ctx.db
		.query("documents")
		.withIndex("by_source_template", (q) =>
			q.eq("sourceTemplateId", templateId),
		)
		.collect();

	return { template, instances };
}
