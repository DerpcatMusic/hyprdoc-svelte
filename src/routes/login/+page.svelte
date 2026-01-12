<script lang="ts">
import { getContext } from 'svelte';
import { Button } from '$lib/components/ui/button';
import { AuthState } from '$lib/stores/auth-state.svelte';

// Access auth state if needed to check if already logged in (though middleware handles this)
// import { AUTH_KEY } from '$lib/stores/auth-state.svelte';

let isLoading = $state(false);

async function handleLogin() {
	isLoading = true;
	// Redirect to WorkOS hosted login or custom API endpoint that generates auth URL
	// Typically we can hit an API route or a server action.
	// For simplicity, let's assume we have an endpoint or we just redirect.
	window.location.href = '/auth/login';
}
</script>

<div class="flex min-h-screen items-center justify-center bg-muted/50 p-4">
	<div class="w-full max-w-md space-y-8 rounded-xl border bg-card p-10 shadow-lg">
		<div class="space-y-2 text-center">
			<h1 class="font-display text-4xl font-bold tracking-tight">HyprDoc</h1>
			<p class="text-muted-foreground">The God-tier contract platform</p>
		</div>

		<div class="space-y-4">
			<Button
				variant="outline"
				class="w-full gap-2 text-base h-12 relative overflow-hidden group"
				onclick={handleLogin}
				disabled={isLoading}
			>
				{#if isLoading}
					<div class="absolute inset-0 flex items-center justify-center bg-background/50">
						<div
							class="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
						></div>
					</div>
				{/if}
				<span class="i-lucide-log-in text-xl"></span>
				Sign in with WorkOS
			</Button>
		</div>

		<div class="text-center text-sm text-muted-foreground">
			By signing in, you agree to our
			<a href="/terms" class="underline hover:text-primary">Terms</a> and
			<a href="/privacy" class="underline hover:text-primary">Privacy Policy</a>.
		</div>
	</div>
</div>
