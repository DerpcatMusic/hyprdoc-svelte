import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { startSigningSession } from "$lib/server/signing-gateway";

export const POST: RequestHandler = async ({ fetch, locals, params }) => {
  if (!locals.auth?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await startSigningSession({
      sessionId: params.sessionId,
      accessToken: locals.auth.accessToken ?? null,
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start signing session",
      },
      { status: 500 }
    );
  }
};
