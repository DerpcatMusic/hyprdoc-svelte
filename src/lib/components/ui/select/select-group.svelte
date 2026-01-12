<script lang="ts">
	import { Select as BitsSelect } from "bits-ui";

	const { children, ...restProps } = $props();
</script>

<BitsSelect.Group {...restProps}>
	{@render children?.()}
</BitsSelect.Group>
