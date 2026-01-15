/**
 * Polar Webhook Handler
 * ════════════════════════════════════════════════════════════════════════════
 * Handles subscription events from Polar.
 * Syncs subscription status to Convex (not WorkOS metadata).
 */
import { Webhooks } from "@polar-sh/sveltekit";
import { POLAR_WEBHOOK_SECRET } from "$env/static/private";
import { PUBLIC_CONVEX_URL } from "$env/static/public";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

type TierId = "free" | "pro" | "enterprise" | "custom";

const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);

export const POST = Webhooks({
  webhookSecret: POLAR_WEBHOOK_SECRET,
  onSubscriptionCreated: async (payload) => handleSubscriptionUpdate(payload),
  onSubscriptionUpdated: async (payload) => handleSubscriptionUpdate(payload),
  onSubscriptionActive: async (payload) => handleSubscriptionUpdate(payload),
  onSubscriptionCanceled: async (payload) => handleSubscriptionUpdate(payload),
  onSubscriptionRevoked: async (payload) => handleSubscriptionUpdate(payload),
  onSubscriptionUncanceled: async (payload) => handleSubscriptionUpdate(payload),
});

async function handleSubscriptionUpdate(payload: any): Promise<void> {
  const sub = payload;

  // Extract workosId from checkout metadata
  const workosId = sub.metadata?.workosId as string | undefined;

  if (!workosId) {
    console.warn("[Polar Webhook] Skipping: No workosId in metadata", sub.id);
    return;
  }

  const status: string = sub.status || "none";

  // Map Polar status to tier
  let tier: TierId = "free";
  if (status === "active" || status === "trialing") {
    tier = "pro";
  }

  const expiresAt = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).getTime()
    : undefined;

  try {
    // Sync to Convex via internal mutation
    await convex.mutation(api.polar.mutations.syncSubscription, {
      workosId,
      tier,
      status: status as "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "none",
      expiresAt,
      polarSubscriptionId: sub.id,
      polarCustomerId: sub.customerId,
    });

    console.log(`[Polar Webhook] Synced subscription for ${workosId}: tier=${tier}, status=${status}`);
  } catch (error) {
    console.error(`[Polar Webhook] Failed to sync subscription for ${workosId}:`, error);
    throw error;
  }
}
