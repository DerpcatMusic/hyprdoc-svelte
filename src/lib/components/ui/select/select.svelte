<script lang="ts">
	import { Select as BitsSelect } from "bits-ui";

	let {
		value = $bindable(""),
		open = $bindable(false),
		children,
		...restProps
	} = $props();
</script>

<BitsSelect.Root type="single" bind:value bind:open {...restProps}>
	{@render children?.()}
</BitsSelect.Root>
