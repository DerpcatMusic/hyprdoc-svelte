import { redirect } from '@sveltejs/kit';
import { getAuthorizationUrl } from '$lib/server/workos';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const returnTo = url.searchParams.get('returnTo');
	const state = returnTo ? JSON.stringify({ returnTo }) : undefined;

	// Parse query params for Direct Routing (Ultrathink)
	let provider = url.searchParams.get('provider');
	const method = url.searchParams.get('method');
	const screenHintParam = url.searchParams.get('screen_hint');
	const loginHint = url.searchParams.get('login_hint');
	const domainHint = url.searchParams.get('domain_hint');
	const connectionId = url.searchParams.get('connection_id');
	const organizationId = url.searchParams.get('organization_id');
	const prompt = url.searchParams.get('prompt');
	const screenHint = screenHintParam === 'sign-up' || screenHintParam === 'sign-in' ? screenHintParam : undefined;

	// Backward-compatible method mapping
	if (!provider && method === 'google') {
		provider = 'GoogleOAuth';
	}

	if (!provider && method === 'email') {
		throw redirect(302, '/auth/email');
	}

	if (!provider && method === 'sso' && !connectionId && !organizationId) {
		const params = new URLSearchParams();
		if (returnTo) params.set('returnTo', returnTo);
		if (screenHint) params.set('screen_hint', screenHint);
		if (loginHint) params.set('email', loginHint);
		throw redirect(302, `/auth/sso${params.toString() ? `?${params.toString()}` : ''}`);
	}

	if (!provider && method === 'passkey') {
		throw redirect(302, '/auth/passkey');
	}

	const isHostedAuthkitFlow = !provider && !connectionId && !organizationId;

	const authorizationUrl = await getAuthorizationUrl({
		state,
		provider: provider ?? undefined,
		screenHint: isHostedAuthkitFlow ? screenHint : undefined,
		loginHint: loginHint ?? undefined,
		domainHint: domainHint ?? undefined,
		connectionId: connectionId ?? undefined,
		organizationId: organizationId ?? undefined,
		prompt: prompt ?? undefined
	});

	throw redirect(302, authorizationUrl);
};
