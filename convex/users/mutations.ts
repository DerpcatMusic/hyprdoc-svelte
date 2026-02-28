/**
 * users/mutations.ts - User Mutations
 * ════════════════════════════════════════════════════════════════════════════
 * User management mutations with Zod validation.
 */
import { internal } from "../_generated/api";
import { mutation, protectedMutation, zMutation, zProtectedMutation, zInternalMutation, z, zid } from "../lib/core";
import type { TierId } from "../lib/tiers/types";

/**
 * Store or update user from WorkOS identity.
 * Called on each authenticated request to keep user data fresh.
 */
export const store = zMutation({
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
export const updateBranding = zProtectedMutation({
	args: {
		brandLogoUrl: z.string().optional(),
		brandLogoPosition: z.enum(["left", "center", "right"]).optional(),
		brandEnabled: z.boolean().optional(),
		brandLogoColor: z.string().optional(),
		clockEnabled: z.boolean().optional(),
		clockOpacity: z.number().optional(),
		clockSize: z.string().optional(),
		clockPosition: z.enum(["left", "center", "right"]).optional(),
		corporateModeEnabled: z.boolean().optional(),
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
export const updateDefaultDocumentSettings = zProtectedMutation({
	args: {
		defaultPaperTexture: z.string().optional(),
		defaultPaperTextureOpacity: z.number().optional(),
		defaultShowMargins: z.boolean().optional(),
		defaultMarginVertical: z.number().optional(),
		defaultMarginHorizontal: z.number().optional(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(ctx.user._id, {
			...(args.defaultPaperTexture !== undefined && { defaultPaperTexture: args.defaultPaperTexture }),
			...(args.defaultPaperTextureOpacity !== undefined && { defaultPaperTextureOpacity: args.defaultPaperTextureOpacity }),
			...(args.defaultShowMargins !== undefined && { defaultShowMargins: args.defaultShowMargins }),
			...(args.defaultMarginVertical !== undefined && { defaultMarginVertical: args.defaultMarginVertical }),
			...(args.defaultMarginHorizontal !== undefined && { defaultMarginHorizontal: args.defaultMarginHorizontal }),
		});

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
export const acceptTerms = zProtectedMutation({
	args: {
		version: z.string(),
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
export const completeOnboarding = zProtectedMutation({
	args: {
		firstName: z.string(),
		lastName: z.string(),
		companyName: z.string(),
		role: z.string(),
		currentERP: z.string(),
		employeeCount: z.string(),
		brandLogoUrl: z.string().optional(),
		brandLogoColor: z.string().optional(),
		agentTone: z.enum(['casual', 'professional', 'friendly']),
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
export const createFromWebhook = zInternalMutation({
	args: {
		workosId: z.string(),
		email: z.string().email(),
		name: z.string().optional(),
		imageUrl: z.string().optional(),
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
export const updateFromWebhook = zInternalMutation({
	args: {
		workosId: z.string(),
		email: z.string().email(),
		name: z.string().optional(),
		imageUrl: z.string().optional(),
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
export const deleteByWorkosId = zInternalMutation({
	args: {
		workosId: z.string(),
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

/**
 * Unified settings update - Profile, Branding, and Doc Defaults
 * Used by the Settings page to save all user preferences at once.
 */
export const updateSettings = zProtectedMutation({
	args: {
		// Profile / Auto-Fill
		firstName: z.string().optional(),
		lastName: z.string().optional(),
		companyName: z.string().optional(),
		jobTitle: z.string().optional(),
		phoneNumber: z.string().optional(),
		physicalAddress: z.string().optional(),
		city: z.string().optional(),
		state: z.string().optional(),
		zipCode: z.string().optional(),
		// Branding
		brandLogoUrl: z.string().optional(),
		brandLogoColor: z.string().optional(),
		brandLogoPosition: z.enum(["left", "center", "right"]).optional(),
		brandEnabled: z.boolean().optional(),
		agentTone: z.enum(["casual", "professional", "friendly"]).optional(),
		// Document Defaults
		defaultPaperTexture: z.string().optional(),
		defaultPaperTextureOpacity: z.number().optional(),
		defaultShowMargins: z.boolean().optional(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db.get(ctx.user._id);
		if (!user) throw new Error("User not found");

		// Build auto-fill profile update
		const currentProfile = user.autoFillProfile ?? {};
		const updatedProfile = {
			...currentProfile,
			...(args.firstName !== undefined && { firstName: args.firstName }),
			...(args.lastName !== undefined && { lastName: args.lastName }),
			...(args.firstName !== undefined || args.lastName !== undefined) && {
				fullName: `${args.firstName ?? currentProfile.firstName ?? ""} ${args.lastName ?? currentProfile.lastName ?? ""}`.trim(),
			},
			...(args.companyName !== undefined && { companyName: args.companyName }),
			...(args.jobTitle !== undefined && { jobTitle: args.jobTitle }),
			...(args.phoneNumber !== undefined && { phoneNumber: args.phoneNumber }),
			...(args.physicalAddress !== undefined && { physicalAddress: args.physicalAddress }),
			...(args.city !== undefined && { city: args.city }),
			...(args.state !== undefined && { state: args.state }),
			...(args.zipCode !== undefined && { zipCode: args.zipCode }),
		};

		// Build full name for display
		const fullName = updatedProfile.fullName || `${args.firstName ?? ""} ${args.lastName ?? ""}`.trim();

		await ctx.db.patch(ctx.user._id, {
			// Profile
			...(fullName && { name: fullName }),
			autoFillProfile: updatedProfile,
			// Branding
			...(args.brandLogoUrl !== undefined && { brandLogoUrl: args.brandLogoUrl }),
			...(args.brandLogoColor !== undefined && { brandLogoColor: args.brandLogoColor }),
			...(args.brandLogoPosition !== undefined && { brandLogoPosition: args.brandLogoPosition }),
			...(args.brandEnabled !== undefined && { brandEnabled: args.brandEnabled }),
			...(args.agentTone !== undefined && { agentTone: args.agentTone }),
			// Document Defaults
			...(args.defaultPaperTexture !== undefined && { defaultPaperTexture: args.defaultPaperTexture }),
			...(args.defaultPaperTextureOpacity !== undefined && { defaultPaperTextureOpacity: args.defaultPaperTextureOpacity }),
			...(args.defaultShowMargins !== undefined && { defaultShowMargins: args.defaultShowMargins }),
		});

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: ctx.user._id,
			actorType: "user" as const,
			resourceType: "user" as const,
			resourceId: ctx.user._id,
			action: "user.settings_updated",
			level: "info" as const,
			metadata: { ...args },
		});

		return null;
	},
});
