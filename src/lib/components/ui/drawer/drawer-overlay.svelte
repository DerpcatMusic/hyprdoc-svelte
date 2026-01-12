<script lang="ts">
	import { Drawer as Vaul } from "vaul-svelte";
	import { cn } from "$lib/utils";

	let {
		class: className,
		ref = $bindable(null),
		...restProps
	}: { class?: string; ref?: HTMLElement | null } & Record<string, any> = $props();
</script>

<Vaul.Overlay
	asChild
	class={cn("fixed inset-0 z-50 bg-black/80", className)}
	{...restProps}
>
	{#snippet child({ props }: { props: Record<string, any> })}
		<div {...props} bind:this={ref}></div>
	{/snippet}
</Vaul.Overlay>
