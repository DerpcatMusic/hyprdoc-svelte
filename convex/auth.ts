/**
 * convex/auth.ts - WorkOS Webhook Handlers
 * ════════════════════════════════════════════════════════════════════════════
 * Handles user lifecycle events from WorkOS webhooks via httpAction to avoid
 * component dependency issues.
 */
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * WorkOS Webhook Event Handler
 * Registers users on first sign-in via webhook events.
 */
export const workosWebhook = httpAction(async (ctx, request) => {
	// Parse the event
	let event: {
		event: string;
		data: {
			id: string;
			email: string;
			firstName?: string;
			lastName?: string;
			profilePictureUrl?: string;
		};
	};

	try {
		event = await request.json();
	} catch {
		return new Response("Invalid JSON", { status: 400 });
	}

	const eventType = event.event;
	const userData = event.data;

	console.log(`[WorkOS Webhook] Received event: ${eventType}`);

	try {
		switch (eventType) {
			case "user.created": {
				const name =
					`${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim() ||
					undefined;


				await ctx.runMutation(internal.users.mutations.createFromWebhook, {
					workosId: userData.id,
					email: userData.email,
					name,
					imageUrl: userData.profilePictureUrl,
				});

				console.log(`[Webhook] Created user ${userData.id}`);
				break;
			}

			case "user.updated": {
				const name =
					`${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim() ||
					undefined;


				await ctx.runMutation(internal.users.mutations.updateFromWebhook, {
					workosId: userData.id,
					email: userData.email,
					name,
					imageUrl: userData.profilePictureUrl,
				});

				console.log(`[Webhook] Updated user ${userData.id}`);
				break;
			}

			case "user.deleted": {

				await ctx.runMutation(internal.users.mutations.deleteByWorkosId, {
					workosId: userData.id,
				});

				console.log(`[Webhook] Deleted user ${userData.id}`);
				break;
			}

			default:
				console.log(`[Webhook] Ignoring event type: ${eventType}`);
		}

		return new Response(JSON.stringify({ received: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error(`[Webhook] Error processing ${eventType}:`, error);
		return new Response(JSON.stringify({ error: "Processing failed" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
});
