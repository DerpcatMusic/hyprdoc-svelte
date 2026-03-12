import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { loadSigningSession } from "$lib/server/signing-gateway";

export const GET: RequestHandler = async ({ fetch, locals, params }) => {
  if (!locals.auth?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await loadSigningSession({
      sessionId: params.sessionId,
      accessToken: locals.auth.accessToken ?? null,
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load signing session",
      },
      { status: 500 }
    );
  }
};
