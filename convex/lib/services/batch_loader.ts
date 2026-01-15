/**
 * Batch Loader Service
 *
 * Optimized data loading utilities for reducing database round-trips.
 * Implements batching patterns for common query scenarios.
 */

import type { Doc, Id } from "@/convex/_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type DocumentId = Id<"documents">;
type workosId = Id<"users">;

export interface BatchLoadResult<T> {
  items: T[];
  notFound: string[];
}

/**
 * Database interface for batch loading.
 * Compatible with Convex QueryCtx.db
 */
interface BatchLoaderDB {
  get(id: string): Promise<any>;
  query(tableName: string): {
    withIndex(
      indexName: string,
      indexRange: (q: any) => any
    ): {
      collect(): Promise<any[]>;
      order(direction: "asc" | "desc"): {
        take(n: number): Promise<any[]>;
        collect(): Promise<any[]>;
      };
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Document Batch Loading
// ═══════════════════════════════════════════════════════════════════════════

export async function batchLoadDocuments(
  db: BatchLoaderDB,
  documentIds: DocumentId[]
): Promise<BatchLoadResult<Doc<"documents">>> {
  const items: Doc<"documents">[] = [];
  const notFound: string[] = [];

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
// User Batch Loading
// ═══════════════════════════════════════════════════════════════════════════

export async function batchLoadUsers(
  db: BatchLoaderDB,
  workosIds: workosId[]
): Promise<Map<string, Doc<"users">>> {
  const usersMap = new Map<string, Doc<"users">>();

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
  document: Doc<"documents">;
  owner?: Doc<"users">;
}

export async function loadDocumentsWithRelations(
  db: BatchLoaderDB,
  documentIds: DocumentId[],
  includeOwner = false
): Promise<DocumentWithRelations[]> {
  // 1. Load all documents
  const { items: documents } = await batchLoadDocuments(db, documentIds);

  // 2. Optionally load owners
  let ownersMap = new Map<string, Doc<"users">>();
  if (includeOwner) {
    const ownerIds = [...new Set(documents.map((d) => d.ownerId))];
    ownersMap = await batchLoadUsers(db, ownerIds);
  }

  // 3. Compose results
  return documents.map((doc) => ({
    document: doc,
    owner: includeOwner ? ownersMap.get(doc.ownerId) : undefined,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// Audit Log Batch Loading
// ═══════════════════════════════════════════════════════════════════════════

export async function batchLoadAuditLogsByDocuments(
  db: BatchLoaderDB,
  documentIds: DocumentId[],
  limit = 100
): Promise<Map<string, Doc<"auditLogs">[]>> {
  const logsByDocument = new Map<string, Doc<"auditLogs">[]>();

  for (const docId of documentIds) {
    logsByDocument.set(docId, []);
  }

  const logPromises = documentIds.map((docId) =>
    db
      .query("auditLogs")
      .withIndex("by_document", (q) => q.eq("documentId", docId))
      .order("desc")
      .take(limit)
  );

  const results = await Promise.all(logPromises);

  for (let i = 0; i < documentIds.length; i++) {
    logsByDocument.set(documentIds[i], results[i]);
  }

  return logsByDocument;
}
