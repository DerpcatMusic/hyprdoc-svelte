import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { saveFieldValueRequestSchema } from "@hyprdoc/domain-types";
import { saveFieldValue } from "$lib/server/signing-gateway";

export const POST: RequestHandler = async ({ fetch, params, request }) => {
  const body = await request.json().catch(() => null);
  const parsedBody = saveFieldValueRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid field value payload" }, { status: 400 });
  }

  try {
    const response = await saveFieldValue({
      portalAccessToken: params.accessToken,
      request: parsedBody.data,
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save field value",
      },
      { status: 500 }
    );
  }
};
