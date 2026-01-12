<!-- This page will redirect, but we need a component for SvelteKit -->
<script lang="ts">
import { Spinner } from '$lib/components/ui/spinner';
// Redirecting to WorkOS AuthKit...
</script>

<div class="flex-center min-h-screen">
	<div class="flex-col-center gap-4">
		<Spinner size="lg" />
		<p class="text-muted-foreground">Redirecting to login...</p>
	</div>
</div>
