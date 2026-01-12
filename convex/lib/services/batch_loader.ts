/**
 * Batch Loader Service
 *
 * Optimized data loading utilities for reducing database round-trips.
 * Implements batching patterns for common query scenarios.
 */

import type { Doc, Id } from '@/convex/_generated/dataModel';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type DocumentId = Id<'documents'>;
type workosId = Id<'users'>;

export interface BatchLoadResult<T> {
	items: T[];
	notFound: string[];
}

/**
 * Database interface for batch loading.
 * Compatible with Convex QueryCtx.db
 * Note: Uses any for db methods as Convex's type system is complex.
 * Type safety is maintained at the function return level.
 */
interface BatchLoaderDB {
	get(id: string): Promise<any>;
	query(tableName: string): {
		withIndex(
			indexName: string,
			indexRange: (q: any) => any
		): {
			collect(): Promise<any[]>;
			order(direction: 'asc' | 'desc'): {
				take(n: number): Promise<any[]>;
				collect(): Promise<any[]>;
			};
		};
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Document Batch Loading
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load multiple documents by their IDs in a single operation.
 * Returns documents in the same order as requested IDs.
 */
export async function batchLoadDocuments(
	db: BatchLoaderDB,
	documentIds: DocumentId[]
): Promise<BatchLoadResult<Doc<'documents'>>> {
	const items: Doc<'documents'>[] = [];
	const notFound: string[] = [];

	// Use Promise.all for parallel fetching
	const results = await Promise.all(documentIds.map((id) => db.get(id)));

	for (let i = 0; i < results.length; i++) {
		const doc = results[i];
		if (doc) {
			items.push(doc);
		} else {
			notFound.push(documentIds[i]);
		}
	}

	return { items, notFound };
}

// ═══════════════════════════════════════════════════════════════════════════
// Signer Batch Loading
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load all signers for multiple documents in a single batch.
 * More efficient than querying signers per document separately.
 */
export async function batchLoadSignersByDocuments(
	db: BatchLoaderDB,
	documentIds: DocumentId[]
): Promise<Map<string, Doc<'signers'>[]>> {
	const signersByDocument = new Map<string, Doc<'signers'>[]>();

	// Initialize map with empty arrays
	for (const docId of documentIds) {
		signersByDocument.set(docId, []);
	}

	// Fetch all signers for all documents in parallel
	const signerPromises = documentIds.map((docId) =>
		db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', docId))
			.collect()
	);

	const results = await Promise.all(signerPromises);

	// Populate the map
	for (let i = 0; i < documentIds.length; i++) {
		signersByDocument.set(documentIds[i], results[i]);
	}

	return signersByDocument;
}

// ═══════════════════════════════════════════════════════════════════════════
// Slot Batch Loading
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load all slots for multiple documents in a single batch.
 */
export async function batchLoadSlotsByDocuments(
	db: BatchLoaderDB,
	documentIds: DocumentId[]
): Promise<Map<string, Doc<'slots'>[]>> {
	const slotsByDocument = new Map<string, Doc<'slots'>[]>();

	// Initialize map
	for (const docId of documentIds) {
		slotsByDocument.set(docId, []);
	}

	// Fetch all slots in parallel
	const slotPromises = documentIds.map((docId) =>
		db
			.query('slots')
			.withIndex('by_document', (q) => q.eq('documentId', docId))
			.collect()
	);

	const results = await Promise.all(slotPromises);

	for (let i = 0; i < documentIds.length; i++) {
		slotsByDocument.set(documentIds[i], results[i]);
	}

	return slotsByDocument;
}

// ═══════════════════════════════════════════════════════════════════════════
// User Batch Loading
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load multiple users by their IDs.
 */
export async function batchLoadUsers(
	db: BatchLoaderDB,
	workosIds: workosId[]
): Promise<Map<string, Doc<'users'>>> {
	const usersMap = new Map<string, Doc<'users'>>();

	const results = await Promise.all(workosIds.map((id) => db.get(id)));

	for (let i = 0; i < results.length; i++) {
		const user = results[i];
		if (user) {
			usersMap.set(workosIds[i], user);
		}
	}

	return usersMap;
}

// ═══════════════════════════════════════════════════════════════════════════
// Document with Relations
// ═══════════════════════════════════════════════════════════════════════════

export interface DocumentWithRelations {
	document: Doc<'documents'>;
	signers: Doc<'signers'>[];
	slots: Doc<'slots'>[];
	owner?: Doc<'users'>;
}

/**
 * Load documents with all their related data in an optimized way.
 * Uses parallel fetching to minimize round-trips.
 */
export async function loadDocumentsWithRelations(
	db: BatchLoaderDB,
	documentIds: DocumentId[],
	includeOwner = false
): Promise<DocumentWithRelations[]> {
	// 1. Load all documents
	const { items: documents } = await batchLoadDocuments(db, documentIds);

	// 2. Load signers and slots in parallel
	const [signersByDoc, slotsByDoc] = await Promise.all([
		batchLoadSignersByDocuments(db, documentIds),
		batchLoadSlotsByDocuments(db, documentIds)
	]);

	// 3. Optionally load owners
	let ownersMap = new Map<string, Doc<'users'>>();
	if (includeOwner) {
		const ownerIds = [...new Set(documents.map((d) => d.ownerId))];
		ownersMap = await batchLoadUsers(db, ownerIds);
	}

	// 4. Compose results
	return documents.map((doc) => ({
		document: doc,
		signers: signersByDoc.get(doc._id) || [],
		slots: slotsByDoc.get(doc._id) || [],
		owner: includeOwner ? ownersMap.get(doc.ownerId) : undefined
	}));
}

// ═══════════════════════════════════════════════════════════════════════════
// Audit Log Batch Loading
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load audit logs for multiple documents efficiently.
 */
export async function batchLoadAuditLogsByDocuments(
	db: BatchLoaderDB,
	documentIds: DocumentId[],
	limit = 100
): Promise<Map<string, Doc<'auditLogs'>[]>> {
	const logsByDocument = new Map<string, Doc<'auditLogs'>[]>();

	for (const docId of documentIds) {
		logsByDocument.set(docId, []);
	}

	const logPromises = documentIds.map((docId) =>
		db
			.query('auditLogs')
			.withIndex('by_document', (q) => q.eq('documentId', docId))
			.order('desc')
			.take(limit)
	);

	const results = await Promise.all(logPromises);

	for (let i = 0; i < documentIds.length; i++) {
		logsByDocument.set(documentIds[i], results[i]);
	}

	return logsByDocument;
}
