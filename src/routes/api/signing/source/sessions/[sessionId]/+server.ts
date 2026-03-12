import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getBearerToken, isAuthorizedSigningSourceRequest } from "$lib/server/signing-source-auth";
import { loadSigningSessionFromConvex } from "$lib/server/signing-gateway";

export const GET: RequestHandler = async ({ fetch, params, request }) => {
  if (!isAuthorizedSigningSourceRequest(request)) {
    return json({ error: "Unauthorized signing source request" }, { status: 401 });
  }

  try {
    const response = await loadSigningSessionFromConvex({
      sessionId: params.sessionId,
      accessToken: getBearerToken(request),
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load signing source session",
      },
      { status: 500 }
    );
  }
};
