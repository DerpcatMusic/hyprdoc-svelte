import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { recordSignatureRequestSchema } from "@hyprdoc/domain-types";
import { recordSignature } from "$lib/server/signing-gateway";

export const POST: RequestHandler = async ({ fetch, params, request }) => {
  const body = await request.json().catch(() => null);
  const parsedBody = recordSignatureRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid signature payload" }, { status: 400 });
  }

  try {
    const response = await recordSignature({
      portalAccessToken: params.accessToken,
      request: parsedBody.data,
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to record signature",
      },
      { status: 500 }
    );
  }
};
