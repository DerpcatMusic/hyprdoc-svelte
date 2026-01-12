<script lang="ts">
	import { Slider as BitsSlider } from "bits-ui";
	import { cn } from "$lib/utils";

	let {
		value = $bindable([0]),
		class: className,
		ref = $bindable(null),
		onValueChange,
		type = "multiple",
		...restProps
	}: { 
		value: number[]; 
		class?: string; 
		ref?: HTMLElement | null; 
		min?: number; 
		max?: number; 
		step?: number;
		type?: "multiple";
		onValueChange?: (v: number[]) => void;
	} & Record<string, any> = $props();
</script>

<BitsSlider.Root
	bind:value
	bind:ref
	class={cn(
		"relative flex w-full touch-none select-none items-center",
		className
	)}
	{type}
	{onValueChange}
	{...restProps}
>
	<span
		class="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary"
	>
		<BitsSlider.Range class="absolute h-full bg-primary" />
	</span>
	{#each value as _, i}
		<BitsSlider.Thumb
			index={i}

			class="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
		/>
	{/each}
</BitsSlider.Root>
