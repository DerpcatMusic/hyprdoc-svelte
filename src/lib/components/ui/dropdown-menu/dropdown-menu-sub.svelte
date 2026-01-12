<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";

	let {
		open = $bindable(false),
		children,
		...restProps
	} = $props();
</script>

<BitsDropdownMenu.Sub bind:open {...restProps}>
	{@render children?.()}
</BitsDropdownMenu.Sub>
