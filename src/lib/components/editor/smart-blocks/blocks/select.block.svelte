<script module lang="ts">
	import { z } from 'zod';
	import { BaseBlockSchema } from '../core/base-schema';
	import { defineBlock } from '../core/define-block';
	
	/**
	 * Select Block Schema
	 */
	export const SelectSchema = BaseBlockSchema.extend({
		type: z.literal('select').default('select'),
		value: z.string().nullable().default(null),
		placeholder: z.string().default('Select an option...'),
		options: z.array(z.object({
			label: z.string(),
			value: z.string()
		})).default([
			{ label: 'Option 1', value: 'opt1' },
			{ label: 'Option 2', value: 'opt2' }
		])
	});

	/**
	 * Select Block Definition
	 */
	export const definition = defineBlock({
		type: 'select',
		label: 'Dropdown',
		category: 'inputs',
		icon: 'i-lucide-chevron-down-square',
		schema: SelectSchema
	});
</script>

<script lang="ts">
	import type { RenderContext } from '../core/types';
	import * as Select from '$lib/components/ui/select';
	import { cn } from '$lib/utils';

	let { attrs, mode, active }: RenderContext = $props();

	const selectedOption = $derived(attrs.options?.find((o: any) => o.value === attrs.value));
</script>

{#if mode === 'view'}
	<div class="flex flex-col gap-1 py-1">
		<div class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
			{attrs.label}
		</div>
		<div class={cn(
			"text-sm px-3 py-1.5 rounded-md border bg-muted/20 border-border/50",
			attrs.value ? "font-semibold text-foreground" : "text-muted-foreground italic font-normal"
		)}>
			{selectedOption?.label || 'Not specified'}
		</div>
	</div>
{:else}
	<div 
		class={cn(
			"flex flex-col gap-2 rounded-lg border p-4 transition-all duration-300",
			mode === 'edit' ? "bg-card/30 border-border" : (active ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-muted/30 border-transparent opacity-60")
		)}
	>
		<div class={cn(
			"text-[10px] font-bold uppercase tracking-widest",
			(mode === 'edit' || active) ? "text-primary" : "text-muted-foreground"
		)}>
			{attrs.label || (mode === 'edit' ? 'Select Field' : 'Dropdown')}
		</div>

		<Select.Root type="single" bind:value={attrs.value} disabled={mode === 'sign' && !active}>
			<Select.Trigger class={cn(
				"w-full transition-all",
				mode === 'edit' ? "bg-card/50" : (active ? "bg-card border-primary/20 ring-primary/10" : "bg-muted/50 border-transparent")
			)}>
				{selectedOption?.label || attrs.placeholder}
			</Select.Trigger>
			<Select.Content class="">
				{#each attrs.options || [] as option}
					<Select.Item value={option.value} label={option.label} class="">
						{option.label}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		{#if mode === 'sign' && !active && attrs.slotId}
			<div class="mt-1 text-[9px] text-muted-foreground italic flex items-center gap-1.5 font-medium">
				<div class="h-1 w-1 rounded-full bg-primary/40"></div>
				Required for: {attrs.slotId}
			</div>
		{/if}
	</div>
{/if}
