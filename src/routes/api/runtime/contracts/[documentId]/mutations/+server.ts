import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { runtimeMutationRequestSchema } from "@hyprdoc/domain-types";
import { applyRuntimeMutation } from "$lib/server/runtime-gateway";

export const POST: RequestHandler = async ({ fetch, locals, params, request }) => {
  if (!locals.auth?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = runtimeMutationRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid mutation payload" }, { status: 400 });
  }

  try {
    const response = await applyRuntimeMutation({
      documentId: params.documentId,
      accessToken: locals.auth.accessToken ?? null,
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
            : "Failed to apply runtime mutation",
      },
      { status: 500 }
    );
  }
};
