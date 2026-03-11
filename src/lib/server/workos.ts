import { WorkOS } from '@workos-inc/node';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

// Initialize WorkOS with API Key
export const workos = new WorkOS(env.WORKOS_API_KEY, {
	clientId: env.WORKOS_CLIENT_ID
});

// Helper types for Session Data
export interface SessionPayload {
	user: any;
	accessToken: string;
	organizationId?: string;
}

const COOKIE_NAME = 'wos-session';

// --- Session Management Helpers ---

export async function setSessionCookie(cookies: Cookies, sealedSession: string) {
	cookies.set(COOKIE_NAME, sealedSession, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30 // 30 days
	});
}

export function getSessionCookie(cookies: Cookies): string | undefined {
	return cookies.get(COOKIE_NAME);
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(COOKIE_NAME, { path: '/' });
}

export async function getAuthorizationUrl(options: { 
	state?: string; 
	screenHint?: 'sign-up' | 'sign-in';
	provider?: string;
	loginHint?: string;
	domainHint?: string;
	connectionId?: string;
	organizationId?: string;
	prompt?: string;
} = {}) {
	// Clean params to avoid empty strings/nulls in the generated URL.
	// Only default to hosted AuthKit when no direct SSO routing data is provided.
	const params: Parameters<typeof workos.userManagement.getAuthorizationUrl>[0] = {
		clientId: env.WORKOS_CLIENT_ID!,
		redirectUri: env.WORKOS_REDIRECT_URI!
	};

	if (options.provider) {
		params.provider = options.provider;
	} else if (!options.connectionId && !options.organizationId) {
		params.provider = 'authkit';
	}

	if (options.state) params.state = options.state;
	if (options.screenHint) params.screenHint = options.screenHint;
	if (options.loginHint) params.loginHint = options.loginHint;
	if (options.domainHint) params.domainHint = options.domainHint;
	if (options.connectionId) params.connectionId = options.connectionId;
	if (options.organizationId) params.organizationId = options.organizationId;
	if (options.prompt) params.prompt = options.prompt;

	console.log(' [WorkOS] Generating Auth URL:', {
		hasClientId: !!env.WORKOS_CLIENT_ID,
		hasRedirectUri: !!env.WORKOS_REDIRECT_URI,
		params
	});

	return workos.userManagement.getAuthorizationUrl(params);
}

/**
 * Validates the session from the cookie.
 * If invalid but refreshable, it refreshes and updates the cookie.
 * Returns the user, accessToken, and session, or null.
 */
export async function verifySession(cookies: Cookies) {
	const sealedSession = getSessionCookie(cookies);
	if (!sealedSession) return null;

	const session = workos.userManagement.loadSealedSession({
		sessionData: sealedSession,
		cookiePassword: env.WORKOS_COOKIE_PASSWORD!
	});

	const authResponse = await session.authenticate();

	if (authResponse.authenticated) {
		return { 
			user: authResponse.user, 
			accessToken: authResponse.accessToken,
			sealedSession 
		};
	}

	// Attempt refresh if session is expired/invalid
	const { reason } = authResponse;
	if ((reason as string) === 'invalid_session_cookie' || (reason as string) === 'expired_session_cookie') {
		try {
			const refreshResponse = await session.refresh();
			if (refreshResponse.authenticated) {
				const { sealedSession: newSealedSession, user: newUser } = refreshResponse;
				if (newSealedSession) {
					await setSessionCookie(cookies, newSealedSession);
					// Re-authenticate with the new sealed session to get fresh accessToken
					const newSession = workos.userManagement.loadSealedSession({
						sessionData: newSealedSession,
						cookiePassword: env.WORKOS_COOKIE_PASSWORD!
					});
					const newAuthResponse = await newSession.authenticate();
					if (newAuthResponse.authenticated) {
						return { 
							user: newUser, 
							accessToken: newAuthResponse.accessToken,
							sealedSession: newSealedSession 
						};
					}
				}
			}
		} catch (e) {
			console.error('Session refresh failed:', e);
		}
	}

	// Session is dead - clear it
	clearSessionCookie(cookies);
	return null;
}

