import { verifySession } from '$lib/server/workos';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const result = await verifySession(event.cookies);

	if (result) {
		event.locals.user = result.user;
		event.locals.auth = {
			user: result.user,
			sessionId: result.sealedSession,
			accessToken: result.accessToken
		};
	} else {
		event.locals.user = null;
		event.locals.auth = null;
	}

	return resolve(event);
};
