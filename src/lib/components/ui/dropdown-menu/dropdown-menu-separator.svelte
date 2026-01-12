<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";
	import { cn } from "$lib/utils";

	const { class: className, ...restProps } = $props();
</script>

<BitsDropdownMenu.Separator
	class={cn("-mx-1 my-1 h-px bg-muted", className)}
	{...restProps}
/>
