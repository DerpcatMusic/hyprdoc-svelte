import type { Handle } from '@sveltejs/kit';
import { getSession } from '$lib/auth/session.server';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await getSession(event.cookies);
	event.locals.session = session;
	event.locals.user = session?.user ?? null;

	return resolve(event);
};
