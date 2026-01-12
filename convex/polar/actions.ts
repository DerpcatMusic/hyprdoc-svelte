import { v } from 'convex/values';
import { api } from '@/convex/_generated/api';
import { action } from '@/convex/_generated/server';
import { getPolarClient } from '@/convex/lib/polar';

/**
 * Action to manually sync a user's subscription from Polar.sh.
 * Useful when webhooks were missed or identifiers were out of sync.
 */
export const syncSubscription = action({
	args: {
		email: v.string(),
		workosId: v.string()
	},
	handler: async (ctx, args) => {
		const accessToken = process.env.POLAR_ACCESS_TOKEN || '';
		console.log(`[Polar Sync] Starting manual sync for ${args.email} (${args.workosId})`);
		console.log(
			`[Polar Sync] Token Prefix: ${accessToken.substring(0, 10)}... (is_sandbox: ${accessToken.startsWith('polar_st_')})`
		);

		try {
			const polar = getPolarClient();

			// 1. List ANY accessible organizations
			console.log("[Polar Sync] Fetching accessible organizations...");
			const orgsList = await polar.organizations.list({});
			const accessibleOrgs = orgsList.result.items;
			console.log(
				"[Polar Sync] Accessible Orgs:",
				accessibleOrgs.map((o) => ({ id: o.id, name: o.name }))
			);

			if (accessibleOrgs.length === 0) {
				return { success: false, reason: 'Your Polar token has no access to any organizations.' };
			}

			// 2. Scan for Subscriptions across ALL orgs
			const allFoundSubscriptions: any[] = [];
			for (const org of accessibleOrgs) {
				console.log(`[Polar Sync] Scanning Org: ${org.name} (${org.id}) for subscriptions...`);
				const subList = await polar.subscriptions.list({ organizationId: org.id, limit: 100 });
				allFoundSubscriptions.push(...(subList.result.items || []));
			}

			console.log(
				`[Polar Sync] Total subscriptions found across all orgs: ${allFoundSubscriptions.length}`
			);

			// 3. Match by email
			let userSubscription = allFoundSubscriptions.find(
				(s: any) => s.customer?.email?.toLowerCase() === args.email.toLowerCase()
			);

			// 4. FALLBACK: Match by Customer List if needed
			if (!userSubscription) {
				console.log(
					"[Polar Sync] No subscription found in broad sweep. Trying customer lookup per org..."
				);
				for (const org of accessibleOrgs) {
					const customers = await polar.customers.list({
						organizationId: org.id,
						email: args.email
					});
					const customer = customers.result.items[0];
					if (customer) {
						console.log(
							`[Polar Sync] Found customer in org ${org.name}: ${customer.id}. Checking their specific subs...`
						);
						const specificSubs = await polar.subscriptions.list({
							organizationId: org.id,
							customerId: customer.id
						});
						if (specificSubs.result.items.length > 0) {
							userSubscription = specificSubs.result.items[0];
							console.log(`[Polar Sync] SUCCESS! Found sub via customer lookup in ${org.name}`);
							break;
						}
					}
				}
			}

			if (!userSubscription) {
				// Log what we DID find for debugging
				const allEmails = allFoundSubscriptions.map((s) => s.customer?.email);
				console.log("[Polar Sync] All subscribed emails found:", allEmails);
				return {
					success: false,
					reason: `No subscription for ${args.email} found after scanning ${accessibleOrgs.length} organizations.`
				};
			}

			const activeSubscription = userSubscription;
			console.log(
				`[Polar Sync] Proceeding with subscription: ${activeSubscription.id} (${activeSubscription.status})`
			);

			// 4. Fetch Product details to determine Tier accurately
			const product = await polar.products.get({ id: activeSubscription.productId });
			const productName = product.name;

			const determineTier = (name: string): 'free' | 'pro' | 'enterprise' => {
				const lowerName = name.toLowerCase();
				if (lowerName.includes('enterprise') || lowerName.includes('business')) { return 'enterprise'; }
				if (
					lowerName.includes('pro') ||
					lowerName.includes('premium') ||
					lowerName.includes('paid') ||
					lowerName.includes('tier')
				) {
					return 'pro';
				}
				return 'free';
			};

			const tier = determineTier(productName);

			// 5. Update Convex via mutation
			const statusMap: Record<
				string,
				'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'none'
			> = {
				active: 'active',
				trialing: 'trialing',
				past_due: 'past_due',
				canceled: 'canceled',
				incomplete: 'incomplete',
				none: 'none'
			};

			const result = await ctx.runMutation(api.polar.mutations.updateSubscription, {
				workosId: args.workosId,
				email: args.email,
				polarSubscriptionId: activeSubscription.id,
				polarCustomerId: activeSubscription.customerId,
				subscriptionStatus: statusMap[activeSubscription.status] || 'active',
				subscriptionTier: tier,
				subscriptionExpiresAt: activeSubscription.currentPeriodEnd
					? new Date(activeSubscription.currentPeriodEnd).getTime()
					: undefined,
				productId: activeSubscription.productId
			});

			console.log(`[Polar Sync] Sync complete for ${args.email}. Result:`, result);

			return {
				success: true,
				status: activeSubscription.status,
				subscriptionId: activeSubscription.id
			};
		} catch (error) {
			console.error('[Polar Sync] Error during manual sync:', error);
			return {
				success: false,
				reason: error instanceof Error ? error.message : 'Unknown error during sync'
			};
		}
	}
});
