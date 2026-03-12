import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { loadRuntimeProjection } from "$lib/server/runtime-gateway";

export const GET: RequestHandler = async ({ fetch, locals, params }) => {
  if (!locals.auth?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await loadRuntimeProjection({
      documentId: params.documentId,
      accessToken: locals.auth.accessToken ?? null,
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load runtime projection",
      },
      { status: 500 }
    );
  }
};
