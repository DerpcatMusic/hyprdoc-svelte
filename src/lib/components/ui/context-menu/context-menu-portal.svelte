<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";

	const { ...restProps }: ContextMenuPrimitive.PortalProps = $props();
</script>

<ContextMenuPrimitive.Portal {...restProps} />
