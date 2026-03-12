import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { sendAuthChallengeRequestSchema } from "@hyprdoc/domain-types";
import { sendAuthChallenge } from "$lib/server/signing-gateway";

export const POST: RequestHandler = async ({ fetch, params, request }) => {
  const body = await request.json().catch(() => null);
  const parsedBody = sendAuthChallengeRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid auth challenge payload" }, { status: 400 });
  }

  try {
    const response = await sendAuthChallenge({
      portalAccessToken: params.accessToken,
      request: parsedBody.data,
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send auth challenge",
      },
      { status: 500 }
    );
  }
};
