<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	interface Props {
		children: Snippet;
		className?: string;
	}

	let { children, className }: Props = $props();
</script>

<div 
	class={cn("flex items-center gap-0.5 px-1", className)}
>
	{@render children()}
</div>
