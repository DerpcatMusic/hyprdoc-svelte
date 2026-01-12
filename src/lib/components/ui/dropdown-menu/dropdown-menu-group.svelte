<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";

	const { children, ...restProps } = $props();
</script>

<BitsDropdownMenu.Group {...restProps}>
	{@render children?.()}
</BitsDropdownMenu.Group>
