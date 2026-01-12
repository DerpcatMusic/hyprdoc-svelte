<script lang="ts">
	import { Dialog as BitsDialog } from "bits-ui";

	let {
		open = $bindable(false),
		children,
		...restProps
	} = $props();
</script>

<BitsDialog.Root bind:open {...restProps}>
	{@render children?.()}
</BitsDialog.Root>
