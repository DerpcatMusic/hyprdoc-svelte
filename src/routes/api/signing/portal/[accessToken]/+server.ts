import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { loadSignerPortal } from "$lib/server/signing-gateway";

export const GET: RequestHandler = async ({ fetch, params }) => {
  try {
    const response = await loadSignerPortal({
      portalAccessToken: params.accessToken,
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load signer portal",
      },
      { status: 500 }
    );
  }
};
