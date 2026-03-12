import { env } from "$env/dynamic/private";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { loadRuntimeProjectionFromConvex } from "$lib/server/runtime-gateway";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function isAuthorized(request: Request) {
  const secret = env.RUNTIME_SOURCE_SECRET;
  if (!secret) {
    return false;
  }

  return request.headers.get("x-hyprdoc-runtime-secret") === secret;
}

export const GET: RequestHandler = async ({ fetch, params, request }) => {
  if (!isAuthorized(request)) {
    return json({ error: "Unauthorized runtime source request" }, { status: 401 });
  }

  try {
    const response = await loadRuntimeProjectionFromConvex({
      documentId: params.documentId,
      accessToken: getBearerToken(request),
      fetch,
    });

    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load runtime source projection",
      },
      { status: 500 }
    );
  }
};
