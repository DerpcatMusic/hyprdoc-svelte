import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { recordSignerViewRequestSchema } from "@hyprdoc/domain-types";
import { recordSignerView } from "$lib/server/signing-gateway";

export const POST: RequestHandler = async ({ fetch, params, request }) => {
  const body = await request.json().catch(() => null);
  const parsedBody = recordSignerViewRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid signer view payload" }, { status: 400 });
  }

  try {
    const response = await recordSignerView({
      portalAccessToken: params.accessToken,
      request: parsedBody.data,
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to record signer view",
      },
      { status: 500 }
    );
  }
};
