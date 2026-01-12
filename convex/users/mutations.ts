import { v } from 'convex/values';
import { internal } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { mutation } from '@/convex/_generated/server';

import type { TierId } from '@/convex/lib/tiers';

/**
 * Store or update user from WorkOS identity.
 * Called on each authenticated request to keep user data fresh.
 * Also checks for and applies any pending subscriptions from webhooks.
 */
export const store = mutation({
	args: {},
	returns: v.id('users'),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error('Authentication required');
		}

		// 1. Try to find user by WorkOS ID (Primary)
		let existingUser = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		// 2. Fallback: Try to find by Email (Migration/Linking)
		if (!existingUser && identity.email) {
			existingUser = await ctx.db
				.query('users')
				.withIndex('by_email', (q) => q.eq('email', identity.email as string))
				.unique();

			if (existingUser) {
				console.log(
					`[Auth] Linked user ${existingUser._id} to WorkOS ID ${identity.subject}`
				);
				// Backfill WorkOS ID
				await ctx.db.patch(existingUser._id, {
					workosId: identity.subject
				});
			}
		}

		const now = Date.now();

		if (existingUser) {
			// Check for pending subscriptions on each login/refresh
			// Try User ID (WorkOS ID)
			let pending = await ctx.db
				.query('pendingSubscriptions')
				.withIndex('by_user_id', (q) => q.eq('workosId', identity.subject))
				.first();

			// Try Email fallback if no direct ID match
			if (!pending && identity.email) {
				pending = await ctx.db
					.query('pendingSubscriptions')
					.withIndex('by_email', (q) => q.eq('email', identity.email as string))
					.first();

				if (pending) {
					console.log(
						`[Polar] Found pending subscription by email fallback for user ${identity.subject}`
					);
				}
			}

			if (pending) {
				// Apply pending subscription and delete it
				await ctx.db.patch(existingUser._id, {
					lastSeenAt: now,
					email: identity.email ?? existingUser.email,
					name: identity.name ?? existingUser.name,
					imageUrl: identity.pictureUrl ?? existingUser.imageUrl,
					// Ensure WorkOS ID is set if it wasn't
					...(existingUser.workosId !== identity.subject ? { workosId: identity.subject } : {}),
					polarSubscriptionId: pending.polarSubscriptionId,
					polarCustomerId: pending.polarCustomerId,
					subscriptionStatus: pending.subscriptionStatus,
					subscriptionTier: pending.subscriptionTier as TierId,
					subscriptionExpiresAt: pending.subscriptionExpiresAt,
					subscriptionProductId: pending.productId,
					hasCompletedPlanSelection: true
				});
				await ctx.db.delete(pending._id);
				console.log(`[Polar] Applied pending subscription to existing user ${identity.subject}`);
			} else {
				// Standard update
				await ctx.db.patch(existingUser._id, {
					lastSeenAt: now,
					email: identity.email ?? existingUser.email,
					name: identity.name ?? existingUser.name,
					imageUrl: identity.pictureUrl ?? existingUser.imageUrl,
					...(existingUser.workosId !== identity.subject ? { workosId: identity.subject } : {})
				});
			}
			return existingUser._id;
		}

		// New user path: check for pending by ID OR email
		let pendingSubscription = await ctx.db
			.query('pendingSubscriptions')
			.withIndex('by_user_id', (q) => q.eq('workosId', identity.subject))
			.first();

		if (!pendingSubscription && identity.email) {
			pendingSubscription = await ctx.db
				.query('pendingSubscriptions')
				.withIndex('by_email', (q) => q.eq('email', identity.email))
				.first();
		}

		// Create new user with pending subscription data if available
		const userId = await ctx.db.insert('users', {
			workosId: identity.subject, // Set WorkOS ID
			email: identity.email ?? '',
			name: identity.name,
			imageUrl: identity.pictureUrl,
			subscriptionTier: (pendingSubscription?.subscriptionTier as TierId) ?? 'free',
			subscriptionStatus: pendingSubscription?.subscriptionStatus ?? 'none',
			polarSubscriptionId: pendingSubscription?.polarSubscriptionId,
			polarCustomerId: pendingSubscription?.polarCustomerId,
			subscriptionExpiresAt: pendingSubscription?.subscriptionExpiresAt,
			subscriptionProductId: pendingSubscription?.productId,
			hasCompletedPlanSelection:
				pendingSubscription?.hasCompletedPlanSelection ?? (pendingSubscription ? true : undefined),
			createdAt: now,
			lastSeenAt: now
		});

		// Delete pending subscription if one was applied
		if (pendingSubscription) {
			await ctx.db.delete(pendingSubscription._id);
			console.log(`[Polar] Applied pending subscription to new user ${identity.subject}`);
		}

		// Log user creation
		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: userId,
			actorType: 'user' as const,
			resourceType: 'user' as const,
			resourceId: userId,
			action: 'user.created',
			level: 'info' as const,
			metadata: { email: identity.email || 'unknown' }
		});

		return userId;
	}
});

/**
 * Update user branding settings.
 */
export const updateBranding = mutation({
	args: {
		brandLogoUrl: v.optional(v.string()),
		brandLogoPosition: v.optional(
			v.union(v.literal('left'), v.literal('center'), v.literal('right'))
		),
		brandEnabled: v.optional(v.boolean()),
		brandLogoColor: v.optional(v.string()),
		clockEnabled: v.optional(v.boolean()),
		clockOpacity: v.optional(v.number()),
		clockSize: v.optional(v.string()),
		clockPosition: v.optional(v.union(v.literal('left'), v.literal('center'), v.literal('right'))),
		corporateModeEnabled: v.optional(v.boolean())
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error('Authentication required');
		}

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) {
			throw new Error('User not found');
		}

		// Cleanup old logo if it's being replaced
		if (
			args.brandLogoUrl !== undefined &&
			user.brandLogoUrl &&
			user.brandLogoUrl !== args.brandLogoUrl
		) {
			try {
				// Extract storageId from URL
				// Format: .../api/storage/<storageId>
				const urlParts = user.brandLogoUrl.split('/api/storage/');
				if (urlParts.length === 2) {
					const storageId = urlParts[1];
					// Simple validation to check if it looks like an ID before attempting delete
					if (storageId && storageId.length > 0) {
						await ctx.storage.delete(storageId as Id<'_storage'>);
					}
				}
			} catch (error) {
				console.error('Failed to delete old branding logo:', error);
				// Continue even if delete fails
			}
		}

		await ctx.db.patch(user._id, {
			...(args.brandLogoUrl !== undefined && {
				brandLogoUrl: args.brandLogoUrl
			}),
			...(args.brandLogoPosition !== undefined && {
				brandLogoPosition: args.brandLogoPosition
			}),
			...(args.brandEnabled !== undefined && {
				brandEnabled: args.brandEnabled
			}),
			...(args.brandLogoColor !== undefined && {
				brandLogoColor: args.brandLogoColor
			}),
			...(args.clockEnabled !== undefined && {
				clockEnabled: args.clockEnabled
			}),
			...(args.clockOpacity !== undefined && {
				clockOpacity: args.clockOpacity
			}),
			...(args.clockSize !== undefined && {
				clockSize: args.clockSize
			}),
			...(args.clockPosition !== undefined && {
				clockPosition: args.clockPosition
			}),
			...(args.corporateModeEnabled !== undefined && {
				corporateModeEnabled: args.corporateModeEnabled
			})
		});

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: user._id,
			actorType: 'user' as const,
			resourceType: 'user' as const,
			resourceId: user._id,
			action: 'user.branding_updated',
			level: 'info' as const,
			metadata: { ...args }
		});

		return null;
	}
});

/**
 * Update user's default document settings.
 * These defaults are applied when creating new documents.
 */
export const updateDefaultDocumentSettings = mutation({
	args: {
		defaultPaperTexture: v.optional(v.string()),
		defaultPaperTextureOpacity: v.optional(v.number()),
		defaultShowMargins: v.optional(v.boolean()),
		defaultMarginVertical: v.optional(v.number()),
		defaultMarginHorizontal: v.optional(v.number())
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error('Authentication required');
		}

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) {
			throw new Error('User not found');
		}

		// Build update object with only defined values
		const updates: Partial<Doc<'users'>> = {};
		if (args.defaultPaperTexture !== undefined) {
			updates.defaultPaperTexture = args.defaultPaperTexture;
		}
		if (args.defaultPaperTextureOpacity !== undefined) {
			updates.defaultPaperTextureOpacity = args.defaultPaperTextureOpacity;
		}
		if (args.defaultShowMargins !== undefined) {
			updates.defaultShowMargins = args.defaultShowMargins;
		}
		if (args.defaultMarginVertical !== undefined) {
			updates.defaultMarginVertical = args.defaultMarginVertical;
		}
		if (args.defaultMarginHorizontal !== undefined) {
			updates.defaultMarginHorizontal = args.defaultMarginHorizontal;
		}

		await ctx.db.patch(user._id, updates);

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: user._id,
			actorType: 'user' as const,
			resourceType: 'user' as const,
			resourceId: user._id,
			action: 'user.document_defaults_updated',
			level: 'info' as const,
			metadata: { ...args }
		});

		return null;
	}
});

/**
 * Accept Terms of Service.
 */
export const acceptTerms = mutation({
	args: {
		version: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { version }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error('Authentication required');
		}

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) {
			throw new Error('User not found');
		}

		await ctx.db.patch(user._id, {
			termsAcceptedAt: Date.now(),
			termsVersion: version
		});

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: user._id,
			actorType: 'user' as const,
			resourceType: 'user' as const,
			resourceId: user._id,
			action: 'user.terms_accepted',
			level: 'info' as const,
			metadata: { version }
		});

		return null;
	}
});
