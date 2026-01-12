<script lang="ts">
	import { RadioGroup as BitsRadioGroup } from "bits-ui";
	import { cn } from "$lib/utils";

	let {
		children,
		class: className,
		value = $bindable(""),
		ref = $bindable(null),
		...restProps
	} = $props();
</script>

<BitsRadioGroup.Root
	bind:value
	bind:ref
	class={cn("grid gap-2", className)}
	{...restProps}
>
	{@render children?.()}
</BitsRadioGroup.Root>
