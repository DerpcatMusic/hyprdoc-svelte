import { redirect, json } from '@sveltejs/kit';
import { getPolarClient } from '$lib/server/polar/api';
import { POLAR_SUCCESS_URL } from '$env/static/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const productId = url.searchParams.get('productId');

		if (!productId) {
			return json({ error: 'productId query parameter is required' }, { status: 400 });
		}

		// Get authenticated user from locals (populated by hooks.server.ts)
		const user = locals.user;
		if (!user) {
			// Redirect to login if not authenticated
			// We can append the productId to the redirect URL if we want to resume after login
			throw redirect(302, `/auth/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
		}

		// Initialize Polar client
		const polar = getPolarClient();

		// Create checkout session with customer linking
		const checkout = await polar.checkouts.create({
			products: [productId],
			successUrl: POLAR_SUCCESS_URL || `${url.origin}/dashboard`,
			// Link to WorkOS user
			externalCustomerId: user.id,
			customerEmail: user.email,
			customerName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || undefined
		});

		// Check if JSON response is requested
		const wantsJson =
			url.searchParams.get('json') === 'true' ||
			url.searchParams.get('accept')?.includes('application/json');

		if (wantsJson) {
			return json({ url: checkout.url });
		}

		// Redirect to Polar checkout
		throw redirect(302, checkout.url);
	} catch (error) {
		if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
			throw error;
		}
		console.error('[Polar Checkout] Error creating checkout:', error);
		return json({ error: 'Failed to create checkout session' }, { status: 500 });
	}
};
