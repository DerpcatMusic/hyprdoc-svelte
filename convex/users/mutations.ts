/**
 * users/mutations.ts - User Mutations
 * ════════════════════════════════════════════════════════════════════════════
 * User management mutations with manual validation.
 * TODO: Migrate to zProtectedMutation once type issues resolved.
 */
import { v } from "convex/values";
import { internal } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { mutation, protectedMutation, internalMutation } from "@/convex/lib/core";
import type { TierId } from "@/convex/lib/tiers";

/**
 * Store or update user from WorkOS identity.
 * Called on each authenticated request to keep user data fresh.
 * Uses `mutation` (not protectedMutation) because user might not exist yet.
 */
export const store = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Authentication required");
		}

		// 1. Try to find user by WorkOS ID (Primary)
		let existingUser = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", identity.subject))
			.unique();

		// 2. Fallback: Try to find by Email (Migration/Linking)
		if (!existingUser && identity.email) {
			existingUser = await ctx.db
				.query("users")
				.withIndex("by_email", (q) => q.eq("email", identity.email as string))
				.unique();

			if (existingUser) {
				console.log(
					`[Auth] Linked user ${existingUser._id} to WorkOS ID ${identity.subject}`,
				);
				await ctx.db.patch(existingUser._id, {
					workosId: identity.subject,
				});
			}
		}

		const now = Date.now();

		if (existingUser) {
			// Check for pending subscriptions on each login/refresh
			let pending = await ctx.db
				.query("pendingSubscriptions")
				.withIndex("by_user_id", (q) => q.eq("workosId", identity.subject))
				.first();

			if (!pending && identity.email) {
				pending = await ctx.db
					.query("pendingSubscriptions")
					.withIndex("by_email", (q) => q.eq("email", identity.email as string))
					.first();
			}

			if (pending) {
				await ctx.db.patch(existingUser._id, {
					lastSeenAt: now,
					email: identity.email ?? existingUser.email,
					name: identity.name ?? existingUser.name,
					imageUrl: identity.pictureUrl ?? existingUser.imageUrl,
					...(existingUser.workosId !== identity.subject && {
						workosId: identity.subject,
					}),
					polarSubscriptionId: pending.polarSubscriptionId,
					polarCustomerId: pending.polarCustomerId,
					subscriptionStatus: pending.subscriptionStatus,
					subscriptionTier: pending.subscriptionTier as TierId,
					subscriptionExpiresAt: pending.subscriptionExpiresAt,
					subscriptionProductId: pending.productId,
					hasCompletedPlanSelection: true,
				});
				await ctx.db.delete(pending._id);
			} else {
				await ctx.db.patch(existingUser._id, {
					lastSeenAt: now,
					email: identity.email ?? existingUser.email,
					name: identity.name ?? existingUser.name,
					imageUrl: identity.pictureUrl ?? existingUser.imageUrl,
					...(existingUser.workosId !== identity.subject && {
						workosId: identity.subject,
					}),
				});
			}
			return existingUser._id;
		}

		// New user: check for pending subscription
		let pendingSubscription = await ctx.db
			.query("pendingSubscriptions")
			.withIndex("by_user_id", (q) => q.eq("workosId", identity.subject))
			.first();

		if (!pendingSubscription && identity.email) {
			pendingSubscription = await ctx.db
				.query("pendingSubscriptions")
				.withIndex("by_email", (q) => q.eq("email", identity.email))
				.first();
		}

		// Create new user (triggers will auto-log)
		const userId = await ctx.db.insert("users", {
			workosId: identity.subject,
			email: identity.email ?? "",
			name: identity.name,
			imageUrl: identity.pictureUrl,
			subscriptionTier:
				(pendingSubscription?.subscriptionTier as TierId) ?? "free",
			subscriptionStatus: pendingSubscription?.subscriptionStatus ?? "none",
			polarSubscriptionId: pendingSubscription?.polarSubscriptionId,
			polarCustomerId: pendingSubscription?.polarCustomerId,
			subscriptionExpiresAt: pendingSubscription?.subscriptionExpiresAt,
			subscriptionProductId: pendingSubscription?.productId,
			hasCompletedPlanSelection: pendingSubscription ? true : undefined,
			createdAt: now,
			lastSeenAt: now,
		});

		if (pendingSubscription) {
			await ctx.db.delete(pendingSubscription._id);
		}

		return userId;
	},
});

/**
 * Update user branding settings.
 */
export const updateBranding = protectedMutation({
	args: {
		brandLogoUrl: v.optional(v.string()),
		brandLogoPosition: v.optional(
			v.union(v.literal("left"), v.literal("center"), v.literal("right")),
		),
		brandEnabled: v.optional(v.boolean()),
		brandLogoColor: v.optional(v.string()),
		clockEnabled: v.optional(v.boolean()),
		clockOpacity: v.optional(v.number()),
		clockSize: v.optional(v.string()),
		clockPosition: v.optional(
			v.union(v.literal("left"), v.literal("center"), v.literal("right")),
		),
		corporateModeEnabled: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db.get(ctx.user._id);
		if (!user) throw new Error("User not found");

		// Cleanup old logo if being replaced
		if (
			args.brandLogoUrl !== undefined &&
			user.brandLogoUrl &&
			user.brandLogoUrl !== args.brandLogoUrl
		) {
			try {
				const urlParts = user.brandLogoUrl.split("/api/storage/");
				if (urlParts.length === 2 && urlParts[1]) {
					await ctx.storage.delete(urlParts[1] as any);
				}
			} catch {
				// Continue even if delete fails
			}
		}

		await ctx.db.patch(ctx.user._id, {
			...(args.brandLogoUrl !== undefined && { brandLogoUrl: args.brandLogoUrl }),
			...(args.brandLogoPosition !== undefined && { brandLogoPosition: args.brandLogoPosition }),
			...(args.brandEnabled !== undefined && { brandEnabled: args.brandEnabled }),
			...(args.brandLogoColor !== undefined && { brandLogoColor: args.brandLogoColor }),
			...(args.clockEnabled !== undefined && { clockEnabled: args.clockEnabled }),
			...(args.clockOpacity !== undefined && { clockOpacity: args.clockOpacity }),
			...(args.clockSize !== undefined && { clockSize: args.clockSize }),
			...(args.clockPosition !== undefined && { clockPosition: args.clockPosition }),
			...(args.corporateModeEnabled !== undefined && { corporateModeEnabled: args.corporateModeEnabled }),
		});

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: ctx.user._id,
			actorType: "user" as const,
			resourceType: "user" as const,
			resourceId: ctx.user._id,
			action: "user.branding_updated",
			level: "info" as const,
			metadata: { ...args },
		});

		return null;
	},
});

/**
 * Update user's default document settings.
 */
export const updateDefaultDocumentSettings = protectedMutation({
	args: {
		defaultPaperTexture: v.optional(v.string()),
		defaultPaperTextureOpacity: v.optional(v.number()),
		defaultShowMargins: v.optional(v.boolean()),
		defaultMarginVertical: v.optional(v.number()),
		defaultMarginHorizontal: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const updates: Partial<Doc<"users">> = {};
		if (args.defaultPaperTexture !== undefined)
			updates.defaultPaperTexture = args.defaultPaperTexture;
		if (args.defaultPaperTextureOpacity !== undefined)
			updates.defaultPaperTextureOpacity = args.defaultPaperTextureOpacity;
		if (args.defaultShowMargins !== undefined)
			updates.defaultShowMargins = args.defaultShowMargins;
		if (args.defaultMarginVertical !== undefined)
			updates.defaultMarginVertical = args.defaultMarginVertical;
		if (args.defaultMarginHorizontal !== undefined)
			updates.defaultMarginHorizontal = args.defaultMarginHorizontal;

		await ctx.db.patch(ctx.user._id, updates);

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: ctx.user._id,
			actorType: "user" as const,
			resourceType: "user" as const,
			resourceId: ctx.user._id,
			action: "user.document_defaults_updated",
			level: "info" as const,
			metadata: { ...args },
		});

		return null;
	},
});

/**
 * Accept Terms of Service.
 */
export const acceptTerms = protectedMutation({
	args: {
		version: v.string(),
	},
	handler: async (ctx, { version }) => {
		await ctx.db.patch(ctx.user._id, {
			termsAcceptedAt: Date.now(),
			termsVersion: version,
		});

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: ctx.user._id,
			actorType: "user" as const,
			resourceType: "user" as const,
			resourceId: ctx.user._id,
			action: "user.terms_accepted",
			level: "info" as const,
			metadata: { version },
		});

		return null;
	},
});

/**
 * Complete user onboarding flow.
 */
export const completeOnboarding = protectedMutation({
	args: {
		firstName: v.string(),
		lastName: v.string(),
		companyName: v.string(),
		role: v.string(),
		currentERP: v.string(),
		employeeCount: v.string(),
		brandLogoUrl: v.optional(v.string()),
		brandLogoColor: v.optional(v.string()),
		agentTone: v.union(v.literal('casual'), v.literal('professional'), v.literal('friendly')),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db.get(ctx.user._id);
		if (!user) throw new Error("User not found");

		await ctx.db.patch(ctx.user._id, {
			name: `${args.firstName} ${args.lastName}`,
			autoFillProfile: {
				...user.autoFillProfile,
				firstName: args.firstName,
				lastName: args.lastName,
				fullName: `${args.firstName} ${args.lastName}`,
				companyName: args.companyName,
				jobTitle: args.role,
			},
			currentERP: args.currentERP,
			employeeCount: args.employeeCount,
			brandLogoUrl: args.brandLogoUrl ?? user.brandLogoUrl,
			brandLogoColor: args.brandLogoColor ?? user.brandLogoColor,
			agentTone: args.agentTone,
			onboardingCompleted: true,
		});

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: ctx.user._id,
			actorType: "user" as const,
			resourceType: "user" as const,
			resourceId: ctx.user._id,
			action: "user.onboarding_completed",
			level: "info" as const,
			metadata: { ...args },
		});

		return null;
	},
});


/**
 * Internal mutation: Create user from WorkOS Webhook
 * Handles checking for pending subscriptions and merging them.
 */
export const createFromWebhook = internalMutation({
	args: {
		workosId: v.string(),
		email: v.string(),
		name: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// 1. Check if user already exists
		const existing = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.unique();

		if (existing) {
			console.log(`[Webhook] User ${args.workosId} already exists, skipping create`);
			return existing._id;
		}

		// 2. Check for pending subscription
		let pending = await ctx.db
			.query("pendingSubscriptions")
			.withIndex("by_user_id", (q) => q.eq("workosId", args.workosId))
			.first();

		// Fallback check by email
		if (!pending) {
			pending = await ctx.db
				.query("pendingSubscriptions")
				.withIndex("by_email", (q) => q.eq("email", args.email))
				.first();
		}

		const now = Date.now();

		const userId = await ctx.db.insert("users", {
			workosId: args.workosId,
			email: args.email,
			name: args.name,
			imageUrl: args.imageUrl,
			subscriptionTier: (pending?.subscriptionTier as TierId) ?? "free",
			subscriptionStatus: pending?.subscriptionStatus ?? "none",
			polarSubscriptionId: pending?.polarSubscriptionId,
			polarCustomerId: pending?.polarCustomerId,
			subscriptionExpiresAt: pending?.subscriptionExpiresAt,
			subscriptionProductId: pending?.productId,
			hasCompletedPlanSelection: pending ? true : undefined,
			createdAt: now,
			lastSeenAt: now,
		});

		if (pending) {
			await ctx.db.delete(pending._id);
		}

		return userId;
	},
});

/**
 * Internal mutation: Update user from WorkOS Webhook
 */
export const updateFromWebhook = internalMutation({
	args: {
		workosId: v.string(),
		email: v.string(),
		name: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.unique();

		if (!user) {
			console.warn(`[Webhook] User ${args.workosId} not found for update`);
			return null;
		}

		await ctx.db.patch(user._id, {
			email: args.email,
			name: args.name ?? user.name,
			imageUrl: args.imageUrl ?? user.imageUrl,
			lastSeenAt: Date.now(),
		});

		return user._id;
	},
});

/**
 * Internal mutation: Delete user from WorkOS Webhook
 */
export const deleteByWorkosId = internalMutation({
	args: {
		workosId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.unique();

		if (!user) {
			console.warn(`[Webhook] User ${args.workosId} not found for deletion`);
			return null;
		}

		await ctx.db.delete(user._id);
		return user._id;
	},
});
