import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { verifyAuthChallengeRequestSchema } from "@hyprdoc/domain-types";
import { getBearerToken, isAuthorizedSigningSourceRequest } from "$lib/server/signing-source-auth";
import { verifyAuthChallengeInConvex } from "$lib/server/signing-gateway";

export const POST: RequestHandler = async ({ fetch, params, request }) => {
  if (!isAuthorizedSigningSourceRequest(request)) {
    return json({ error: "Unauthorized signing source request" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = verifyAuthChallengeRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid signing source challenge verification payload" }, { status: 400 });
  }

  try {
    const response = await verifyAuthChallengeInConvex({
      portalAccessToken: params.accessToken,
      challengeId: params.challengeId,
      request: parsedBody.data,
      accessToken: getBearerToken(request),
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to verify signing source challenge",
      },
      { status: 500 }
    );
  }
};
