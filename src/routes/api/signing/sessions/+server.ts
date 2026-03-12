import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createSigningSessionRequestSchema } from "@hyprdoc/domain-types";
import { createSigningSession } from "$lib/server/signing-gateway";

export const POST: RequestHandler = async ({ fetch, locals, request }) => {
  if (!locals.auth?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = createSigningSessionRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "Invalid signing session payload" }, { status: 400 });
  }

  try {
    const response = await createSigningSession({
      request: parsedBody.data,
      accessToken: locals.auth.accessToken ?? null,
      fetch,
    });
    return json(response);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create signing session",
      },
      { status: 500 }
    );
  }
};
