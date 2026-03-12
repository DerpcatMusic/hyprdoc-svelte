import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createSigningSessionRequestSchema } from "@hyprdoc/domain-types";
import { createSigningSessionInConvex } from "$lib/server/signing-gateway";
import { getBearerToken, isAuthorizedSigningSourceRequest } from "$lib/server/signing-source-auth";

export const POST: RequestHandler = async ({ fetch, request }) => {
  if (!isAuthorizedSigningSourceRequest(request)) {
    return json({ error: "Unauthorized signing source request" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = createSigningSessionRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid signing source session payload" }, { status: 400 });
  }

  try {
    const response = await createSigningSessionInConvex({
      request: parsedBody.data,
      accessToken: getBearerToken(request),
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create signing source session",
      },
      { status: 500 }
    );
  }
};
