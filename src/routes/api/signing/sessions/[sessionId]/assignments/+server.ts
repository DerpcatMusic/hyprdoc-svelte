import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { assignSignerRequestSchema } from "@hyprdoc/domain-types";
import { assignSigner } from "$lib/server/signing-gateway";

export const POST: RequestHandler = async ({ fetch, locals, params, request }) => {
  if (!locals.auth?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = assignSignerRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid signer assignment payload" }, { status: 400 });
  }

  try {
    const response = await assignSigner({
      sessionId: params.sessionId,
      request: parsedBody.data,
      accessToken: locals.auth.accessToken ?? null,
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to assign signer",
      },
      { status: 500 }
    );
  }
};
