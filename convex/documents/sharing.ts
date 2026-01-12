import { v } from 'convex/values';
import { internal } from '@/convex/_generated/api';
import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
	query
} from '@/convex/_generated/server';
import { requireAuth, requireDocumentAccess } from '@/convex/lib/auth';
import { generateAccessToken, generateOtpCode } from '@/convex/lib/crypto';
import { requestContextValidator } from '@/convex/lib/validators';

const OTP_EXPIRY_MINUTES = 10;
const GUEST_TOKEN_EXPIRY_HOURS = 12;

/**
 * Invite a user to collaborate on a document.
 */
export const invite = mutation({
	args: {
		documentId: v.id('documents'),
		email: v.string(),
		role: v.union(v.literal('viewer'), v.literal('editor'), v.literal('admin'))
	},
	handler: async (ctx, args) => {
		// 1. Check permissions (Must be Admin or Owner)
		await requireDocumentAccess(ctx, args.documentId, 'admin');

		const { userId: inviterId } = await requireAuth(ctx);
		const normalizedEmail = args.email.trim().toLowerCase();

		// 2. Check overlap
		const existingMember = await ctx.db
			.query('documentMembers')
			.withIndex('by_document_and_email', (q) =>
				q.eq('documentId', args.documentId).eq('email', normalizedEmail)
			)
			.unique();

		const now = Date.now();
		const inviteToken = generateAccessToken();
		const inviteTokenExpiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

		if (existingMember) {
			if (existingMember.status === 'active') {
				throw new Error('User is already an active member');
			}

			// Update existing pending invite
			await ctx.db.patch(existingMember._id, {
				inviteToken,
				inviteTokenExpiresAt,
				role: args.role, // Allow updating role while we're at it
				addedBy: inviterId,
				addedAt: now
			});

			// Schedule email sending
			await ctx.scheduler.runAfter(0, internal.documents.sharing.sendInviteEmailInternal, {
				documentId: args.documentId,
				email: normalizedEmail,
				inviteToken,
				role: args.role,
				inviterId
			});

			return { memberId: existingMember._id, inviteToken };
		}

		// 3. Resolve User (if exists)
		const existingUser = await ctx.db
			.query('users')
			.withIndex('by_email', (q) => q.eq('email', normalizedEmail))
			.unique();

		// 4. Create Membership
		const memberId = await ctx.db.insert('documentMembers', {
			documentId: args.documentId,
			email: normalizedEmail,
			workosId: existingUser?._id, // Link immediately if user exists
			role: args.role,
			status: existingUser ? 'active' : 'pending', // Active if user matches, else pending
			inviteToken,
			inviteTokenExpiresAt,
			addedBy: inviterId,
			addedAt: now
		});

		// 5. Audit Log (async)
		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: inviterId,
			actorType: 'user',
			documentId: args.documentId,
			resourceType: 'user',
			resourceId: memberId,
			action: 'collaboration.invited',
			level: 'info',
			metadata: {
				email: normalizedEmail,
				role: args.role,
				...(existingUser?._id && { invitedworkosId: existingUser._id })
			}
		});

		// 6. Send invite email (async)
		await ctx.scheduler.runAfter(0, internal.documents.sharing.sendInviteEmailInternal, {
			documentId: args.documentId,
			email: normalizedEmail,
			inviteToken,
			role: args.role,
			inviterId
		});

		return { memberId, inviteToken };
	}
});

/**
 * Internal action to send invite email.
 * This is scheduled by the invite mutation to run asynchronously.
 */

export const sendInviteEmailInternal = internalAction({
	args: {
		documentId: v.id('documents'),
		email: v.string(),
		inviteToken: v.string(),
		role: v.string(),
		inviterId: v.id('users')
	},
	handler: async (ctx, args) => {
		try {
			const { sendEmail, generateCollaborationInviteEmail } = await import('../lib/email');

			// Fetch document title
			const document = await ctx.runQuery(internal.documents.queries.get.getDocumentInternal, {
				documentId: args.documentId
			});

			// Fetch inviter info
			const inviter = await ctx.runQuery(internal.users.queries.getUserInternal, {
				workosId: args.inviterId
			});

			const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
			const inviteLink = `${appUrl}/invite/${args.inviteToken}`;

			const emailContent = generateCollaborationInviteEmail({
				recipientEmail: args.email,
				documentTitle: document?.title || 'Untitled Document',
				inviterName: inviter?.name || inviter?.email || 'A team member',
				role: args.role,
				inviteLink
			});

			await sendEmail({
				to: args.email,
				...emailContent
			});

			console.log(
				`[Collaboration Invite] Email sent to ${args.email} for document ${args.documentId}`
			);
		} catch (error) {
			console.error('[Collaboration Invite] Failed to send email:', error);
			// In dev mode, log the invite link for testing
			const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
			console.log(`[DEV] Invite link for ${args.email}: ${appUrl}/invite/${args.inviteToken}`);
		}
	}
});

/**
 * Accept an invite via token.
 */
export const acceptInvite = mutation({
	args: { inviteToken: v.string() },
	handler: async (ctx, args) => {
		const { userId } = await requireAuth(ctx);

		const member = await ctx.db
			.query('documentMembers')
			.withIndex('by_invite_token', (q) => q.eq('inviteToken', args.inviteToken))
			.unique();

		if (!member) {
			throw new Error('Invalid invite link');
		}

		if (member.inviteTokenExpiresAt && member.inviteTokenExpiresAt < Date.now()) {
			throw new Error('Invite link has expired');
		}

		// If member already has a user ID linked, ensure it matches current user (security)
		if (member.workosId && member.workosId !== userId) {
			throw new Error('This invite is for a different user');
		}

		// Link user and activate
		await ctx.db.patch(member._id, {
			workosId: userId,
			status: 'active',
			inviteToken: undefined, // Clear token (one-time use)
			inviteTokenExpiresAt: undefined
		});

		// Log
		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: userId,
			actorType: 'user',
			documentId: member.documentId,
			resourceType: 'user',
			resourceId: member._id,
			action: 'collaboration.joined',
			level: 'info',
			metadata: { method: 'link' }
		});

		return member.documentId;
	}
});

/**
 * Get a member by document and email.
 */
export const getMemberByEmail = query({
	args: { documentId: v.id('documents'), email: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query('documentMembers')
			.withIndex('by_document_and_email', (q) =>
				q.eq('documentId', args.documentId).eq('email', args.email.trim().toLowerCase())
			)
			.unique();
	}
});

/**
 * Request a Guest OTP for a non-account holder.
 */
export const requestGuestOtp = action({
	args: {
		documentId: v.id('documents'),
		email: v.string(),
		ctx: requestContextValidator
	},
	handler: async (ctx, args) => {
		const normalizedEmail = args.email.trim().toLowerCase();

		// 1. Verify membership exists
		const member = await ctx.runQuery(internal.documents.sharing.getMemberByEmailInternal, {
			documentId: args.documentId,
			email: normalizedEmail
		});

		if (!member) {
			throw new Error('You have not been invited to this document.');
		}

		const code = generateOtpCode();
		const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

		// 2. Store OTP
		await ctx.runMutation(internal.documents.sharing.createGuestOtpInternal, {
			memberId: member._id,
			code,
			expiresAt,
			sentTo: normalizedEmail,
			ipAddress: args.ctx.ipAddress
		});

		// 3. Send Email
		try {
			const { sendEmail, generateOtpEmail } = await import('../lib/email');

			const emailContent = generateOtpEmail({
				recipientName: 'Collaborator',
				code,
				expiresInMinutes: OTP_EXPIRY_MINUTES
			});

			await sendEmail({
				to: normalizedEmail,
				...emailContent
			});
		} catch (e) {
			console.error('[Guest OTP] Failed to send email:', e);
			// In dev, log the code
			console.log(`[DEV] Guest OTP for ${normalizedEmail}: ${code}`);
		}

		return { success: true };
	}
});

/**
 * Verify Guest OTP and receive a temporary access token.
 */
export const verifyGuestOtp = mutation({
	args: {
		documentId: v.id('documents'),
		email: v.string(),
		code: v.string(),
		ctx: requestContextValidator
	},
	handler: async (ctx, args) => {
		const normalizedEmail = args.email.trim().toLowerCase();

		const member = await ctx.db
			.query('documentMembers')
			.withIndex('by_document_and_email', (q) =>
				q.eq('documentId', args.documentId).eq('email', normalizedEmail)
			)
			.unique();

		if (!member) { throw new Error('Membership not found'); }

		const otp = await ctx.db
			.query('otpCodes')
			.withIndex('by_member_and_type', (q) => q.eq('memberId', member._id).eq('type', 'email'))
			.order('desc')
			.first();

		if (!otp || otp.usedAt || otp.expiresAt < Date.now()) {
			throw new Error('Invalid or expired code.');
		}

		if (otp.code !== args.code) {
			await ctx.db.patch(otp._id, { attempts: otp.attempts + 1 });
			throw new Error('Invalid verification code.');
		}

		// Success
		const now = Date.now();
		const guestAccessToken = generateAccessToken();
		const guestTokenExpiresAt = now + GUEST_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

		await ctx.db.patch(otp._id, { usedAt: now });
		await ctx.db.patch(member._id, {
			guestAccessToken,
			guestTokenExpiresAt,
			status: 'active' // Mark as active once verified
		});

		// Audit Log
		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: undefined, // Guest user, no workosId
			actorType: 'user',
			documentId: args.documentId,
			resourceType: 'document',
			resourceId: args.documentId,
			action: 'collaboration.guest_verified',
			level: 'info',
			ipAddress: args.ctx.ipAddress,
			userAgent: args.ctx.userAgent,
			metadata: { memberId: member._id, email: normalizedEmail }
		});

		return { guestAccessToken, guestTokenExpiresAt };
	}
});

/**
 * Internal helper to find member.
 */
export const getMemberByEmailInternal = internalQuery({
	args: { documentId: v.id('documents'), email: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query('documentMembers')
			.withIndex('by_document_and_email', (q) =>
				q.eq('documentId', args.documentId).eq('email', args.email)
			)
			.unique();
	}
});

/**
 * Internal helper to create OTP.
 */
export const createGuestOtpInternal = internalMutation({
	args: {
		memberId: v.id('documentMembers'),
		code: v.string(),
		expiresAt: v.number(),
		sentTo: v.string(),
		ipAddress: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert('otpCodes', {
			memberId: args.memberId,
			type: 'email',
			code: args.code,
			expiresAt: args.expiresAt,
			attempts: 0,
			sentAt: Date.now(),
			sentTo: args.sentTo,
			ipAddress: args.ipAddress
		});
	}
});

/**
 * Remove a collaborator.
 */
export const remove = mutation({
	args: {
		documentId: v.id('documents'),
		memberId: v.id('documentMembers')
	},
	handler: async (ctx, args) => {
		// 1. Check permissions (Must be Admin)
		const { workosId: userId } = await requireDocumentAccess(ctx, args.documentId, 'admin');

		const member = await ctx.db.get(args.memberId);
		if (!member) { throw new Error('Member not found'); }

		if (member.documentId !== args.documentId) {
			throw new Error('Member does not belong to this document');
		}

		// prevent removing self? (Or maybe allowed to leave?)
		// If admin removes self, ensure there is another admin/owner?
		// Start simple: Owners cannot be removed via this (they are not in documentMembers table usually,
		// or if they are, logic handles it. But wait, Owner is separate in Document table.
		// documentMembers only stores added members. So Owner is safe.)

		await ctx.db.delete(args.memberId);

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: userId,
			actorType: 'user',
			documentId: args.documentId,
			resourceType: 'user',
			resourceId: args.memberId,
			action: 'collaboration.removed',
			level: 'info'
		});
	}
});

/**
 * Detach self from a shared document (leave a document you've been invited to).
 */
export const detachSelf = mutation({
	args: { documentId: v.id('documents') },
	handler: async (ctx, args) => {
		const { userId } = await requireAuth(ctx);

		// Find user's membership
		const member = await ctx.db
			.query('documentMembers')
			.withIndex('by_document_and_user', (q) =>
				q.eq('documentId', args.documentId).eq('workosId', userId)
			)
			.unique();

		if (!member) {
			throw new Error('You are not a member of this document');
		}

		// Delete membership
		await ctx.db.delete(member._id);

		// Audit log
		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: userId,
			actorType: 'user',
			documentId: args.documentId,
			resourceType: 'user',
			resourceId: member._id,
			action: 'collaboration.self_detached',
			level: 'info'
		});

		return { success: true };
	}
});

/**
 * Update a collaborator's role.
 */
export const updateRole = mutation({
	args: {
		documentId: v.id('documents'),
		memberId: v.id('documentMembers'),
		newRole: v.union(v.literal('viewer'), v.literal('editor'), v.literal('admin'))
	},
	handler: async (ctx, args) => {
		// 1. Check permissions (Must be Admin)
		const { workosId } = await requireDocumentAccess(ctx, args.documentId, 'admin');

		const member = await ctx.db.get(args.memberId);
		if (!member) { throw new Error('Member not found'); }
		if (member.documentId !== args.documentId) { throw new Error('Member mismatch'); }

		await ctx.db.patch(args.memberId, { role: args.newRole });

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId,
			actorType: 'user',
			documentId: args.documentId,
			resourceType: 'user',
			resourceId: args.memberId,
			action: 'collaboration.role_updated',
			level: 'info',
			metadata: { from: member.role, to: args.newRole }
		});
	}
});

/**
 * Get all collaborators for a document.
 */
export const getCollaborators = query({
	args: {
		documentId: v.id('documents'),
		guestToken: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		// Verify access (Viewers can see who else is on the team)
		const access = await requireDocumentAccess(ctx, args.documentId, 'viewer', args.guestToken);

		const members = await ctx.db
			.query('documentMembers')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();

		// Join with User info
		const membersWithDetails = await Promise.all(
			members.map(async (m) => {
				let userProfile = null;
				if (m.workosId) {
					userProfile = await ctx.db.get(m.workosId);
				}
				return {
					...m,
					user: userProfile
						? {
								name: userProfile.name,
								email: userProfile.email,
								imageUrl: userProfile.imageUrl
							}
						: null
				};
			})
		);

		// Also include Owner details?
		const owner = await ctx.db.get(access.document.ownerId);

		// Fetch active temp links if admin

		const activeTempLinks =
			access.role === 'admin' || access.role === 'owner'
				? await ctx.db

						.query('tempInviteLinks')

						.withIndex('by_document', (q) => q.eq('documentId', args.documentId))

						.collect()
				: undefined;

		return {
			owner: owner
				? {
						_id: owner._id,
						name: owner.name,
						email: owner.email,
						imageUrl: owner.imageUrl
					}
				: null,
			members: membersWithDetails,
			settings: access.document.settings,
			activeTempLinks
		};
	}
});

/**
 * Create a temporary invite link.
 */
export const createTempInviteLink = mutation({
	args: {
		documentId: v.id('documents'),
		role: v.union(v.literal('viewer'), v.literal('editor')),
		expiresInMinutes: v.optional(v.number()),
		maxUses: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const { workosId: userId } = await requireDocumentAccess(ctx, args.documentId, 'admin');

		const token = generateAccessToken();
		const expiresAt = args.expiresInMinutes
			? Date.now() + args.expiresInMinutes * 60 * 1000
			: undefined;

		await ctx.db.insert('tempInviteLinks', {
			documentId: args.documentId,
			token,
			role: args.role,
			expiresAt,
			maxUses: args.maxUses || 1,
			usedCount: 0,
			createdBy: userId!,
			createdAt: Date.now()
		});

		return token;
	}
});

/**
 * Delete a temporary invite link.
 */
export const deleteTempInviteLink = mutation({
	args: {
		documentId: v.id('documents'),
		linkId: v.id('tempInviteLinks')
	},
	handler: async (ctx, args) => {
		await requireDocumentAccess(ctx, args.documentId, 'admin');
		await ctx.db.delete(args.linkId);
	}
});

/**
 * Join a document via temporary invite link.
 */
export const joinViaTempInvite = mutation({
	args: {
		token: v.string(),
		email: v.string()
	},
	handler: async (ctx, args) => {
		const normalizedEmail = args.email.trim().toLowerCase();

		// 1. Find Link
		const link = await ctx.db
			.query('tempInviteLinks')
			.withIndex('by_token', (q) => q.eq('token', args.token))
			.unique();

		if (!link) {
			throw new Error('Invalid or expired invite link');
		}

		// 2. Validate Expiration/Usage
		if (link.expiresAt && link.expiresAt < Date.now()) {
			throw new Error('This invite link has expired');
		}
		if (link.maxUses && link.usedCount >= link.maxUses) {
			throw new Error('This invite link has been fully used');
		}

		// 3. Find Document
		const doc = await ctx.db.get(link.documentId);
		if (!doc) { throw new Error('Document not found'); }

		// 4. Check if already a member
		const existingMember = await ctx.db
			.query('documentMembers')
			.withIndex('by_document_and_email', (q) =>
				q.eq('documentId', link.documentId).eq('email', normalizedEmail)
			)
			.unique();

		if (existingMember) {
			return { documentId: doc._id, membershipStatus: 'existing' };
		}

		// 5. Resolve User (if exists)
		const existingUser = await ctx.db
			.query('users')
			.withIndex('by_email', (q) => q.eq('email', normalizedEmail))
			.unique();

		// 6. Create Membership
		const memberId = await ctx.db.insert('documentMembers', {
			documentId: doc._id,
			email: normalizedEmail,
			workosId: existingUser?._id,
			role: link.role,
			status: 'active',
			addedBy: link.createdBy,
			addedAt: Date.now()
		});

		// 7. Increment Usage
		await ctx.db.patch(link._id, {
			usedCount: link.usedCount + 1
		});

		// 8. Audit Log
		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: existingUser?._id,
			actorType: existingUser ? 'user' : 'system',
			documentId: doc._id,
			resourceType: 'user',
			resourceId: memberId,
			action: 'collaboration.joined_via_temp_link',
			level: 'info',
			metadata: { email: normalizedEmail, role: link.role, linkId: link._id }
		});

		return { documentId: doc._id, membershipStatus: 'joined' };
	}
});

/**
 * Get public info about a temp invite.
 */
export const getTempInviteInfo = query({
	args: { token: v.string() },
	handler: async (ctx, args) => {
		const link = await ctx.db
			.query('tempInviteLinks')
			.withIndex('by_token', (q) => q.eq('token', args.token))
			.unique();

		if (!link) { return null; }
		if (link.expiresAt && link.expiresAt < Date.now()) { return null; }
		if (link.maxUses && link.usedCount >= link.maxUses) { return null; }

		const doc = await ctx.db.get(link.documentId);
		if (!doc) { return null; }

		const owner = await ctx.db.get(doc.ownerId);

		return {
			title: doc.title,
			ownerName: owner?.name,
			ownerImage: owner?.imageUrl,
			role: link.role
		};
	}
});
