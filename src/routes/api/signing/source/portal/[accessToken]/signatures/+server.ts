import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { recordSignatureRequestSchema } from "@hyprdoc/domain-types";
import { getBearerToken, isAuthorizedSigningSourceRequest } from "$lib/server/signing-source-auth";
import { recordSignatureInConvex } from "$lib/server/signing-gateway";

export const POST: RequestHandler = async ({ fetch, params, request }) => {
  if (!isAuthorizedSigningSourceRequest(request)) {
    return json({ error: "Unauthorized signing source request" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = recordSignatureRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid signing source signature payload" }, { status: 400 });
  }

  try {
    const response = await recordSignatureInConvex({
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
          error instanceof Error ? error.message : "Failed to record signing source signature",
      },
      { status: 500 }
    );
  }
};
