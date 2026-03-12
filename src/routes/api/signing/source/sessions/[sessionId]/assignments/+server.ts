import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { assignSignerRequestSchema } from "@hyprdoc/domain-types";
import { assignSignerInConvex } from "$lib/server/signing-gateway";
import { getBearerToken, isAuthorizedSigningSourceRequest } from "$lib/server/signing-source-auth";

export const POST: RequestHandler = async ({ fetch, params, request }) => {
  if (!isAuthorizedSigningSourceRequest(request)) {
    return json({ error: "Unauthorized signing source request" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = assignSignerRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid signing source assignment payload" }, { status: 400 });
  }

  try {
    const response = await assignSignerInConvex({
      sessionId: params.sessionId,
      request: parsedBody.data,
      accessToken: getBearerToken(request),
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to assign signing source signer",
      },
      { status: 500 }
    );
  }
};
