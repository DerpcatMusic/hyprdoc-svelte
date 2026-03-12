import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { recordSignerViewRequestSchema } from "@hyprdoc/domain-types";
import { getBearerToken, isAuthorizedSigningSourceRequest } from "$lib/server/signing-source-auth";
import { recordSignerViewInConvex } from "$lib/server/signing-gateway";

export const POST: RequestHandler = async ({ fetch, params, request }) => {
  if (!isAuthorizedSigningSourceRequest(request)) {
    return json({ error: "Unauthorized signing source request" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = recordSignerViewRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid signing source view payload" }, { status: 400 });
  }

  try {
    const response = await recordSignerViewInConvex({
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
          error instanceof Error ? error.message : "Failed to record signing source view",
      },
      { status: 500 }
    );
  }
};
