<script lang="ts">
	import { Drawer as Vaul } from "vaul-svelte";
	import { cn } from "$lib/utils";

	let {
		class: className,
		children,
		ref = $bindable(null),
		...restProps
	} = $props();
</script>

<Vaul.Title
	bind:ref
	class={cn(
		"text-lg font-semibold leading-none tracking-tight",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</Vaul.Title>
