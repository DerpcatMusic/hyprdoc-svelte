<script lang="ts">
	const { children } = $props();
</script>

<div class="min-h-screen bg-background font-sans antialiased">
	{@render children()}
</div>
