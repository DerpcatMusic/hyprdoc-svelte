import { WorkOS } from '@workos-inc/node';
import { WORKOS_API_KEY, WORKOS_CLIENT_ID } from '$env/static/private';

let workosInstance: WorkOS | null = null;

export function getWorkOS(): WorkOS {
	if (!workosInstance) {
		if (!WORKOS_API_KEY) {
			throw new Error('WORKOS_API_KEY environment variable is not set');
		}
		workosInstance = new WorkOS(WORKOS_API_KEY, {
			clientId: WORKOS_CLIENT_ID
		});
	}
	return workosInstance;
}
