<script lang="ts">
/**
 * UserSync Component
 *
 * Syncs the WorkOS user with Convex on authentication.
 * Should be mounted once in the root layout when user is authenticated.
 * Uses $effect for the async sync operation which is appropriate for
 * browser-only side effects.
 * 
 * Includes retry logic to handle the race condition where Convex WebSocket
 * hasn't received the auth token yet.
 */
import { untrack } from 'svelte';
import { useConvexMutation } from '$lib/convex/hooks';
import { api } from '@/convex/_generated/api';
import { useAuth } from '$lib/stores/auth-state.svelte';

const auth = useAuth();
const storeUser = useConvexMutation(api.users.mutations.store);

let hasSynced = $state(false);
let retryCount = $state(0);
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 500;

async function syncUserWithRetry(): Promise<void> {
	try {
		await storeUser.mutate({});
		hasSynced = true;
		retryCount = 0;
		console.log('[UserSync] User synced to Convex successfully');
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		// Check if it's an auth error and we can retry
		if (errorMessage.includes('Authentication required') && retryCount < MAX_RETRIES) {
			retryCount++;
			console.warn(`[UserSync] Auth not ready, retrying... (${retryCount}/${MAX_RETRIES})`);
			
			// Wait and retry
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * retryCount));
			return syncUserWithRetry();
		}
		
		console.error('[UserSync] Failed to sync user:', error);
	}
}

$effect(() => {
	// Only track auth state changes, not hasSynced or retryCount
	const isAuthenticated = auth.isAuthenticated;
	const hasToken = !!auth.session?.accessToken;

	if (isAuthenticated && hasToken) {
		// Use untrack to avoid creating dependency on hasSynced
		const alreadySynced = untrack(() => hasSynced);
		if (!alreadySynced) {
			// Add a small initial delay to let Convex WebSocket establish auth
			setTimeout(() => {
				syncUserWithRetry();
			}, 300);
		}
	}
});

// Reset sync state on logout
$effect(() => {
	if (!auth.isAuthenticated) {
		hasSynced = false;
		retryCount = 0;
	}
});
</script>

<!-- This component renders nothing, it only syncs user data -->
