import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { workosWebhook } from "./auth";

const http = httpRouter();

// ═══════════════════════════════════════════════════════════════
// WorkOS Webhook Handler
// ═══════════════════════════════════════════════════════════════
http.route({
  path: "/workos/webhook",
  method: "POST",
  handler: workosWebhook,
});

http.route({
  pathPrefix: "/api/storage/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    // Path will be like /api/storage/<storageId>
    const pathParts = url.pathname.split("/");
    const storageId = pathParts.at(-1);

    if (!storageId) {
      return new Response("Missing storageId", { status: 400 });
    }

    try {
      const id = storageId as Id<"_storage">;
      const blob = await ctx.storage.get(id);
      if (!blob) {
        return new Response("File not found", { status: 404 });
      }

      // Try to determine content type from the blob itself if possible,
      // or default to a generic type. Convex storage blobs usually have a type.
      const contentType = blob.type || "application/octet-stream";

      return new Response(blob, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error("Error serving storage file:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }),
});

// ═══════════════════════════════════════════════════════════════
// GOD MODE - Admin tier grant/revoke
// ═══════════════════════════════════════════════════════════════
http.route({
  path: "/api/admin/godmode",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { secret, workosId, action } = body as {
        secret?: string;
        workosId?: string; // WorkOS User ID
        action?: string;
      };

      // Validate secret from environment
      const godModeSecret = process.env.GOD_MODE_SECRET;
      if (!godModeSecret) {
        return new Response(
          JSON.stringify({ error: "God mode not configured" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (secret !== godModeSecret) {
        return new Response(JSON.stringify({ error: "Invalid secret" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!workosId) {
        return new Response(JSON.stringify({ error: "workosId is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!(action && ["grant", "revoke"].includes(action))) {
        return new Response(
          JSON.stringify({ error: "action must be 'grant' or 'revoke'" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Find user (Queries not needed, mutations handle lookup internally now)
      // But we need to ensure the user exists for the response,
      // actually mutations.ts grantCustomTier handles the lookup.
      // Wait, we call runMutation.

      if (action === "grant") {
        await ctx.runMutation(internal.polar.mutations.grantCustomTier, {
          workosId,
        });
      } else {
        await ctx.runMutation(internal.polar.mutations.revokeCustomTier, {
          workosId,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          action,
          workosId,
          message: `Custom tier ${action}ed successfully`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("[GodMode] Error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
