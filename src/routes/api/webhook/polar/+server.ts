import { Webhooks } from "@polar-sh/sveltekit";
import { POLAR_WEBHOOK_SECRET } from "$env/static/private";
import { syncSubscriptionToWorkOS, type TierId } from "$lib/server/polar/sync-workos";

export const POST = Webhooks({
	webhookSecret: POLAR_WEBHOOK_SECRET,
	onSubscriptionCreated: async (payload) => handleSubscriptionUpdate(payload),
	onSubscriptionUpdated: async (payload) => handleSubscriptionUpdate(payload),
	onSubscriptionActive: async (payload) => handleSubscriptionUpdate(payload),
	onSubscriptionCanceled: async (payload) => handleSubscriptionUpdate(payload),
	onSubscriptionRevoked: async (payload) => handleSubscriptionUpdate(payload),
	onSubscriptionUncanceled: async (payload) => handleSubscriptionUpdate(payload), // Handle uncancel if needed
});

async function handleSubscriptionUpdate(payload: any) {
    // The payload from the specific handlers is the event specific data object
    // e.g. Subscription
    const sub = payload;

	// Extract metadata attached during checkout
	const workosId = sub.metadata?.workosId;

	if (!workosId) {
		console.warn("[Polar Webhook] Skipping sync: No workosId in metadata", sub.id);
		return;
	}

	const status = sub.status || "none";
	// Simple Tier Mapping
	let tier: TierId = "free";
	if (status === "active" || status === "trialing") {
		tier = "pro";
	}

	const expiresAt = sub.currentPeriodEnd
		? new Date(sub.currentPeriodEnd).getTime()
		: undefined;

	await syncSubscriptionToWorkOS(workosId, tier, status as any, expiresAt, sub.customerId);
}
