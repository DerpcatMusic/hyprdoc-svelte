import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { WORKOS_CLIENT_ID, WORKOS_COOKIE_PASSWORD, WORKOS_REDIRECT_URI } from '$env/static/private';
import { getWorkOS } from './client.server';
import type { Session, User } from './types';

const SESSION_COOKIE_NAME = 'wos-session';

export async function getSession(cookies: Cookies): Promise<Session | null> {
	const sessionData = cookies.get(SESSION_COOKIE_NAME);

	if (!sessionData || sessionData === 'undefined') {
		return null;
	}

	console.log(`[Auth] Session cookie found (length: ${sessionData.length}). Validating...`);

	try {
		const workos = getWorkOS();
		const authResult = await workos.userManagement.authenticateWithSessionCookie({
			sessionData,
			cookiePassword: WORKOS_COOKIE_PASSWORD
		});

		if (!authResult.authenticated) {
			console.warn('[Auth] Session authentication failed. Reason:', authResult.reason);
			cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
			return null;
		}

		console.log(`[Auth] Session authenticated for user: ${authResult.user.email}`);

		const user: User = {
			id: authResult.user.id,
			email: authResult.user.email,
			firstName: authResult.user.firstName,
			lastName: authResult.user.lastName,
			profilePictureUrl: authResult.user.profilePictureUrl,
			createdAt: authResult.user.createdAt,
			updatedAt: authResult.user.updatedAt
		};

		return {
			user,
			sessionId: authResult.sessionId,
			organizationId: authResult.organizationId,
			role: authResult.role,
			permissions: authResult.permissions,
			accessToken: authResult.accessToken
		};
	} catch (error) {
		console.error('Session validation failed:', error);
		cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
		return null;
	}
}

export function getAuthorizationUrl(state?: string): string {
	const workos = getWorkOS();
	console.log(
		`[Auth] Generating AuthURL with ClientID starting with: ${WORKOS_CLIENT_ID?.slice(0, 7)}... (length: ${WORKOS_CLIENT_ID?.length})`
	);
	return workos.userManagement.getAuthorizationUrl({
		provider: 'authkit',
		redirectUri: WORKOS_REDIRECT_URI,
		clientId: WORKOS_CLIENT_ID,
		state
	});
}

export async function authenticateWithCode(code: string, cookies: Cookies): Promise<Session> {
	const workos = getWorkOS();

	const { user, sealedSession, accessToken, organizationId } =
		await workos.userManagement.authenticateWithCode({
			code,
			clientId: WORKOS_CLIENT_ID,
			session: {
				sealSession: true,
				cookiePassword: WORKOS_COOKIE_PASSWORD
			}
		});

	if (!sealedSession) {
		console.error('[Auth] Failed to generate sealedSession. Check WORKOS_COOKIE_PASSWORD length.');
		throw new Error('Authentication failed: No session generated');
	}

	console.log(
		`[Auth] Code exchanged successfully. Setting cookie for: ${user.email} (length: ${sealedSession.length})`
	);

	cookies.set(SESSION_COOKIE_NAME, sealedSession, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30 // 30 days
	});

	return {
		user: {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			profilePictureUrl: user.profilePictureUrl,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		},
		sessionId: '', // Will be available on next request
		organizationId: organizationId ?? undefined,
		accessToken
	};
}

export async function refreshSession(cookies: Cookies): Promise<Session | null> {
	const sessionData = cookies.get(SESSION_COOKIE_NAME);

	if (!sessionData || sessionData === 'undefined') {
		return null;
	}

	try {
		const workos = getWorkOS();
		const refreshResult = await workos.userManagement.authenticateWithSessionCookie({
			sessionData,
			cookiePassword: WORKOS_COOKIE_PASSWORD
		});

		// authenticateWithSessionCookie doesn't have a direct 'refresh' yet in basic usage
		// but typically we can check if it's still valid or use a refresh token if available
		// For now, we return the authenticated session
		if (!refreshResult.authenticated) {
			cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
			return null;
		}

		const user: User = {
			id: refreshResult.user.id,
			email: refreshResult.user.email,
			firstName: refreshResult.user.firstName,
			lastName: refreshResult.user.lastName,
			profilePictureUrl: refreshResult.user.profilePictureUrl,
			createdAt: refreshResult.user.createdAt,
			updatedAt: refreshResult.user.updatedAt
		};

		return {
			user,
			sessionId: refreshResult.sessionId,
			organizationId: refreshResult.organizationId,
			role: refreshResult.role,
			permissions: refreshResult.permissions,
			accessToken: refreshResult.accessToken
		};
	} catch (error) {
		console.error('Session refresh failed:', error);
		return null;
	}
}

export function destroySession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

export async function getLogoutUrl(cookies: Cookies): Promise<string | null> {
	const sessionData = cookies.get(SESSION_COOKIE_NAME);

	if (!sessionData || sessionData === 'undefined') {
		return null;
	}

	try {
		const workos = getWorkOS();
		return workos.userManagement.getLogoutUrl({
			sessionId: '' // We don't have sessionId in sealed cookie directly without unsealing
		});
	} catch {
		return null;
	}
}
