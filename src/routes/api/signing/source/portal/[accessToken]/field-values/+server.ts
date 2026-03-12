import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { saveFieldValueRequestSchema } from "@hyprdoc/domain-types";
import { getBearerToken, isAuthorizedSigningSourceRequest } from "$lib/server/signing-source-auth";
import { saveFieldValueInConvex } from "$lib/server/signing-gateway";

export const POST: RequestHandler = async ({ fetch, params, request }) => {
  if (!isAuthorizedSigningSourceRequest(request)) {
    return json({ error: "Unauthorized signing source request" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = saveFieldValueRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid signing source field value payload" }, { status: 400 });
  }

  try {
    const response = await saveFieldValueInConvex({
      portalAccessToken: params.accessToken,
      request: parsedBody.data,
      accessToken: getBearerToken(request),
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save signing source field value",
      },
      { status: 500 }
    );
  }
};
