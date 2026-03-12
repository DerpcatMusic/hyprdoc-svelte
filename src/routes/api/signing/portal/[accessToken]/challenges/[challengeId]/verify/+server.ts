import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { verifyAuthChallengeRequestSchema } from "@hyprdoc/domain-types";
import { verifyAuthChallenge } from "$lib/server/signing-gateway";

export const POST: RequestHandler = async ({ fetch, params, request }) => {
  const body = await request.json().catch(() => null);
  const parsedBody = verifyAuthChallengeRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid auth verification payload" }, { status: 400 });
  }

  try {
    const response = await verifyAuthChallenge({
      portalAccessToken: params.accessToken,
      challengeId: params.challengeId,
      request: parsedBody.data,
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to verify auth challenge",
      },
      { status: 500 }
    );
  }
};
