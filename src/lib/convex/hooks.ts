/**
 * Convex Integration Hooks
 *
 * Svelte-compatible wrappers for Convex queries and mutations.
 * Built on top of convex-svelte with enhanced patterns for HyprDoc.
 */

import { useConvexClient, useQuery as useConvexQuery } from "convex-svelte";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Re-export core hooks and define useConvexMutation
 */
export function useConvexMutation(mutation: any) {
  const client = useConvexClient();
  return {
    mutate: (args: any) => client.mutation(mutation, args),
  };
}

export { useConvexQuery, useConvexClient };

/**
 * Document Queries
 */

export function useDocument(documentId: Id<"documents"> | string | null) {
  return useConvexQuery(
    api.documents.queries.get.get,
    documentId ? { documentId: documentId as Id<"documents"> } : "skip"
  );
}

export function useDocuments(kind?: "envelope" | "template") {
  return useConvexQuery(api.documents.queries.list.list, kind ? { kind } : {});
}

/**
 * Document Mutations
 */

export function useCreateDocument() {
  return useConvexMutation(api.documents.mutations.create.create);
}

export function useUpdateDocument() {
  return useConvexMutation(api.documents.mutations.update.update);
}

export function useDeleteDocument() {
  return useConvexMutation(api.documents.mutations.delete.remove);
}

/**
 * Storage Queries & Mutations
 */

export function useFileUrl(storageId: string | null | undefined) {
  const isBase64 = storageId?.startsWith("data:");

  const result = useConvexQuery(
    api.storage.queries.getFileUrl,
    storageId && !isBase64 ? { storageId } : "skip"
  );

  // If it's base64, return it directly
  if (isBase64) {
    return {
      data: storageId,
      isLoading: false,
      error: undefined,
    };
  }

  return result;
}

export function useGenerateUploadUrl() {
  return useConvexMutation(api.storage.mutations.generateUploadUrl);
}

/**
 * Helper: Upload a file to Convex storage
 */
export async function uploadFile(
  file: Blob,
  generateUploadUrl: () => Promise<string>
): Promise<string> {
  // 1. Get upload URL
  const postUrl = await generateUploadUrl();

  // 2. Upload file
  const response = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  const { storageId } = await response.json();
  return storageId;
}

/**
 * User Queries
 */

export function useUser(workosIdOrGetter: string | null | (() => string | null)) {
  return useConvexQuery(
    api.users.queries.getByWorkosId,
    () => {
      const workosId = typeof workosIdOrGetter === 'function' ? workosIdOrGetter() : workosIdOrGetter;
      return workosId ? { workosId } : "skip";
    }
  );
}

/**
 * Type Guards & Utilities
 */

export function isConvexId(
  id: string | null | undefined
): id is Id<"documents"> {
  return typeof id === "string" && id.length > 0;
}

/**
 * Optimistic Update Helper
 *
 * Temporarily updates local state before server confirmation.
 * Useful for instant UI feedback.
 */
export function createOptimisticUpdate<T>(
  currentData: T,
  updateFn: (data: T) => T
): T {
  return updateFn(currentData);
}
