<script lang="ts">
	import { Tabs as BitsTabs } from "bits-ui";

	let {
		value = $bindable(""),
		children,
		ref = $bindable(null),
		...restProps
	} = $props();
</script>

<BitsTabs.Root bind:value bind:ref {...restProps}>
	{@render children?.()}
</BitsTabs.Root>
