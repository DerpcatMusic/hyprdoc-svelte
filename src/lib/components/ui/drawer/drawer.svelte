<script lang="ts">
	import { Drawer as Vaul } from "vaul-svelte";

	let {
		open = $bindable(false),
		children,
		...restProps
	} = $props();
</script>

<Vaul.Root bind:open {...restProps}>
	{@render children?.()}
</Vaul.Root>
