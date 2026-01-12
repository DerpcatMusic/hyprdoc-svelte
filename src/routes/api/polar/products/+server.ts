import { json } from '@sveltejs/kit';
import { getPolarClient } from '$lib/server/polar/api';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const polar = getPolarClient();
		const organizationId = env.POLAR_ORGANIZATION_ID;

		// Fetch products using the SDK
		const response = await polar.products.list({
			organizationId: organizationId || undefined,
			isArchived: false,
			limit: 100
		});

		if (!response?.result?.items) {
			console.error('[Polar Products] Invalid response structure:', response);
			throw new Error('Invalid response structure from Polar API');
		}

		// Transform to a simpler format for frontend
		const products = response.result.items.map((product) => ({
			id: product.id,
			name: product.name,
			description: product.description,
			isRecurring: product.isRecurring,
			prices: (product.prices ?? []).map((price: any) => ({
				id: price.id,
				amount:
					price.amountType === 'free'
						? 0
						: price.amountType === 'custom'
							? -1
							: (price.priceAmount ?? 0) / 100,
				currency: price.priceCurrency,
				interval: price.recurringInterval,
				amountType: price.amountType
			})),
			benefits: (product.benefits ?? []).map((benefit: any) => ({
				id: benefit.id,
				type: benefit.type,
				description: benefit.description,
				metadata: benefit.metadata || {},
				note: benefit.properties?.note || null
			}))
		}));

		return json({ products });
	} catch (error) {
		console.error('[Polar Products] Error:', error);
		return json(
			{
				error: 'Failed to fetch products from Polar',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
