import { env } from "$env/dynamic/private";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { runtimeMutationRequestSchema } from "@hyprdoc/domain-types";
import { applyRuntimeMutationToConvex } from "$lib/server/runtime-gateway";

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

export const POST: RequestHandler = async ({ fetch, params, request }) => {
  if (!isAuthorized(request)) {
    return json({ error: "Unauthorized runtime source request" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = runtimeMutationRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid runtime source mutation payload" }, { status: 400 });
  }

  try {
    const response = await applyRuntimeMutationToConvex({
      documentId: params.documentId,
      accessToken: getBearerToken(request),
      fetch,
      mutation: parsedBody.data,
    });

    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to apply runtime source mutation",
      },
      { status: 500 }
    );
  }
};
