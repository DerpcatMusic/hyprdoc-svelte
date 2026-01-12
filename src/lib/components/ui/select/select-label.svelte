<script lang="ts">
	import { Select as BitsSelect } from "bits-ui";
	import { cn } from "$lib/utils";

	const { class: className, children, ...restProps } = $props();
</script>

<BitsSelect.GroupHeading
	class={cn("px-2 py-1.5 text-sm font-semibold", className)}
	{...restProps}
>
	{@render children?.()}
</BitsSelect.GroupHeading>
