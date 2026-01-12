import type { Doc, Id } from '@/convex/_generated/dataModel';
import type { MutationCtx, QueryCtx } from '@/convex/_generated/server';

/**
 * Custom error for authentication failures.
 */
export class AuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthError';
	}
}

/**
 * Get the authenticated user's ID from Clerk token.
 * Throws AuthError if not authenticated.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<{
	workosId: Id<'users'>;
	userId: Id<'users'>;
	identity: { subject: string; email?: string };
}> {
	const identity = await ctx.auth.getUserIdentity();

	if (!identity) {
		throw new AuthError('Authentication required');
	}

	const user = await ctx.db
		.query('users')
		.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
		.unique();

	if (!user) {
		throw new AuthError('User not found. Please sync your account.');
	}

	return {
		workosId: user._id,
		userId: user._id,
		identity: {
			subject: identity.subject,
			email: identity.email
		}
	};
}

/**
 * Get user if authenticated, null otherwise.
 * Use for optional auth scenarios.
 */
export async function getAuthOptional(
	ctx: QueryCtx | MutationCtx
): Promise<{ userId: Id<'users'>; identity: { subject: string } } | null> {
	const identity = await ctx.auth.getUserIdentity();

	if (!identity) {
		return null;
	}

	const user = await ctx.db
		.query('users')
		.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
		.unique();

	if (!user) {
		return null;
	}

	return { userId: user._id, identity: { subject: identity.subject } };
}

/**
 * Verify user owns a document.
 * Throws AuthError if not authorized.
 */
export async function requireDocumentOwner(
	ctx: QueryCtx | MutationCtx,
	documentId: Id<'documents'>
): Promise<{
	workosId: Id<'users'>;
	userId: Id<'users'>;
	document: Doc<'documents'>;
}> {
	const { workosId, userId } = await requireAuth(ctx);

	const document = await ctx.db.get(documentId);

	if (!document) {
		throw new AuthError('Document not found');
	}

	if (document.ownerId !== userId) {
		throw new AuthError('Not authorized to access this document');
	}

	return { workosId, userId, document: document as Doc<'documents'> };
}

// NOTE: requireTemplateOwner removed 2025-12-21
// Templates are now stored in 'documents' table with kind: "template"
// Use requireDocumentOwner instead

/**
 * Access levels for document collaboration
 */
export type AccessRole = 'viewer' | 'editor' | 'admin' | 'owner';

function getRoleLevel(role: AccessRole | 'pending'): number {
	switch (role) {
		case 'owner':
			return 4;
		case 'admin':
			return 3;
		case 'editor':
			return 2;
		case 'viewer':
			return 1;
		default:
			return 0;
	}
}

/**
 * Verify user has required access level to a document.
 * Checks both ownership and documentMembers table.
 * Supports guestAccessToken for non-account holders.
 */
export async function requireDocumentAccess(
	ctx: QueryCtx | MutationCtx,
	documentId: Id<'documents'>,
	requiredRole: AccessRole,
	guestToken?: string
): Promise<{
	workosId?: Id<'users'>;
	userId?: Id<'users'>;
	memberId?: Id<'documentMembers'>;
	document: Doc<'documents'>;
	role: AccessRole;
}> {
	const identity = await ctx.auth.getUserIdentity();
	let userId: Id<'users'> | undefined;

	if (identity) {
		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();
		if (user) { userId = user._id; }
	}

	const document = await ctx.db.get(documentId);

	if (!document) {
		throw new AuthError('Document not found');
	}

	// 1. Check Ownership (highest level)
	if (userId && document.ownerId === userId) {
		return { workosId: userId, userId, document: document as Doc<'documents'>, role: 'owner' };
	}

	// 2. Check Membership
	let member: Doc<'documentMembers'> | null = null;

	if (userId) {
		member = await ctx.db
			.query('documentMembers')
			.withIndex('by_document_and_user', (q) => q.eq('documentId', documentId).eq('workosId', userId))
			.unique();
	}

	// Fallback to Guest Token if provided and no Clerk member found
	if (!member && guestToken) {
		member = await ctx.db
			.query('documentMembers')
			.withIndex('by_guest_token', (q) => q.eq('guestAccessToken', guestToken))
			.unique();

		if (member) {
			// Security: Ensure token belongs to THIS document
			if (member.documentId !== documentId) {
				throw new AuthError('Invalid guest token for this document');
			}
			// Security: Check expiry
			if (member.guestTokenExpiresAt && member.guestTokenExpiresAt < Date.now()) {
				throw new AuthError('Guest access token expired');
			}
		}
	}

	if (!member || member.status !== 'active') {
		throw new AuthError('Not authorized to access this document');
	}

	// 3. Check Role Hierarchy
	const userLevel = getRoleLevel(member.role as AccessRole);
	const requiredLevel = getRoleLevel(requiredRole);

	if (userLevel < requiredLevel) {
		throw new AuthError(
			`Insufficient permissions. Required: ${requiredRole}, Actual: ${member.role}`
		);
	}

	return {
		workosId: userId,
		userId,
		memberId: member._id,
		document: document as Doc<'documents'>,
		role: member.role as AccessRole
	};
}
