<script lang="ts">
	import { LinkPreview as BitsHoverCard } from "bits-ui";

	let {
		children,
		open = $bindable(false),
		...restProps
	} = $props();
</script>

<BitsHoverCard.Root bind:open {...restProps}>
	{@render children?.()}
</BitsHoverCard.Root>
