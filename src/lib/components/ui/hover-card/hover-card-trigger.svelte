<script lang="ts">
	import { LinkPreview as BitsHoverCard } from "bits-ui";
	import { cn } from "$lib/utils";

	let {
		children,
		class: className,
		ref = $bindable(null),
		...restProps
	} = $props();
</script>

<BitsHoverCard.Trigger
	bind:ref
	class={cn("underline-offset-4 hover:underline", className)}
	{...restProps}
>
	{@render children?.()}
</BitsHoverCard.Trigger>
