/**
 * Editor Page Server Load
 * ════════════════════════════════════════════════════════════════════════════
 * SIMPLIFIED: No SSR document fetch - client-side WebSocket subscription is faster.
 * Just pass auth info and documentId to the client.
 */
import type { PageServerLoad } from "./$types";
import type { Id } from "@/convex/_generated/dataModel";

export const load: PageServerLoad = async ({ params, locals }) => {
  // Just pass the documentId and auth info to the client
  // Document will be fetched client-side via WebSocket subscription (FAST)
  return {
    documentId: params.documentId as Id<"documents">,
    workosId: locals.auth?.user?.id ?? null,
    userName: locals.auth?.user?.firstName ?? locals.auth?.user?.email ?? "User",
    accessToken: locals.auth?.accessToken ?? null,
  };
};

