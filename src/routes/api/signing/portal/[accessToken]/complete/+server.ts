import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { completeSignerSession } from "$lib/server/signing-gateway";

export const POST: RequestHandler = async ({ fetch, params }) => {
  try {
    const response = await completeSignerSession({
      portalAccessToken: params.accessToken,
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to complete signer session",
      },
      { status: 500 }
    );
  }
};
