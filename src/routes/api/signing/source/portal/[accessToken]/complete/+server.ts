import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { completeSignerSessionInConvex } from "$lib/server/signing-gateway";
import { getBearerToken, isAuthorizedSigningSourceRequest } from "$lib/server/signing-source-auth";

export const POST: RequestHandler = async ({ fetch, params, request }) => {
  if (!isAuthorizedSigningSourceRequest(request)) {
    return json({ error: "Unauthorized signing source request" }, { status: 401 });
  }

  try {
    const response = await completeSignerSessionInConvex({
      portalAccessToken: params.accessToken,
      accessToken: getBearerToken(request),
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to complete signing source session",
      },
      { status: 500 }
    );
  }
};
