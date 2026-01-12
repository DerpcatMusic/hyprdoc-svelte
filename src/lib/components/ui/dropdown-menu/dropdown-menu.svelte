<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";

	let {
		ref = $bindable(null),
		children,
		...restProps
	} = $props();
</script>

<BitsDropdownMenu.Root {...restProps}>
	{@render children?.()}
</BitsDropdownMenu.Root>
