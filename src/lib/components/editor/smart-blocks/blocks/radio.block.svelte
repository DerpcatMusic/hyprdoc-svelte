<script module lang="ts">
	import { z } from 'zod';
	import { BaseBlockSchema } from '../core/base-schema';
	import { defineBlock } from '../core/define-block';
	
	/**
	 * Radio Block Schema
	 */
	export const RadioSchema = BaseBlockSchema.extend({
		type: z.literal('radio').default('radio'),
		value: z.string().nullable().default(null),
		options: z.array(z.object({
			label: z.string(),
			value: z.string()
		})).default([
			{ label: 'Option 1', value: 'opt1' },
			{ label: 'Option 2', value: 'opt2' }
		])
	});

	/**
	 * Radio Block Definition
	 */
	export const definition = defineBlock({
		type: 'radio',
		label: 'Radio Group',
		category: 'inputs',
		icon: 'i-lucide-list',
		schema: RadioSchema
	});
</script>

<script lang="ts">
	import type { RenderContext } from '../core/types';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';
	import { cn } from '$lib/utils';

	let { attrs, mode, active }: RenderContext = $props();

	const selectedOption = $derived(attrs.options?.find((o: any) => o.value === attrs.value));
</script>

{#if mode === 'view'}
	<div class="flex flex-col gap-1.5 py-1">
		<div class="text-xs font-bold text-muted-foreground uppercase tracking-widest">
			{attrs.label}
		</div>
		<div class="flex items-center gap-2">
			<div class={cn(
				"flex size-4 items-center justify-center rounded-full border transition-colors",
				attrs.value ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-muted-foreground/20"
			)}>
				{#if attrs.value}
					<div class="h-1.5 w-1.5 rounded-full bg-current" />
				{/if}
			</div>
			<span class={cn(
				"text-sm transition-colors",
				attrs.value ? "font-semibold text-foreground" : "text-muted-foreground italic"
			)}>
				{selectedOption?.label || 'Not selected'}
			</span>
		</div>
	</div>
{:else}
	<div 
		class={cn(
			"space-y-3 rounded-lg border p-4 transition-all duration-300",
			mode === 'edit' ? "bg-card/30 border-border" : (active ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-muted/30 border-transparent opacity-60 grayscale-[0.5]")
		)}
	>
		<div class={cn(
			"mb-2 text-sm font-bold uppercase tracking-wider",
			(mode === 'edit' || active) ? "text-primary" : "text-muted-foreground"
		)}>
			{attrs.label || (mode === 'edit' ? 'Select an option' : 'Radio Group')}
		</div>

		<RadioGroup.Root bind:value={attrs.value} disabled={mode === 'sign' && !active} class="grid gap-2">
			{#each attrs.options || [] as option}
				<div class={cn(
					"flex items-center space-x-3 rounded-md p-2 transition-all",
					mode === 'edit' ? "hover:bg-accent/20" : (active && "hover:bg-accent/20"),
					active && attrs.value === option.value && "bg-primary/10 border border-primary/10"
				)}>
					<RadioGroup.Item 
						value={option.value} 
						id={`${attrs.id}-${option.value}`} 
						class={cn(active && "ring-2 ring-primary/10")}
					>
					</RadioGroup.Item>
					<Label 
						for={`${attrs.id}-${option.value}`} 
						class={cn(
							"text-sm font-medium leading-none transition-colors",
							(mode === 'edit' || active) ? "cursor-pointer text-foreground" : "text-muted-foreground"
						)}
					>
						{option.label}
					</Label>
				</div>
			{/each}
		</RadioGroup.Root>

		{#if mode === 'edit' && attrs.description}
			<p class="mt-2 text-xs text-muted-foreground italic">
				{attrs.description}
			</p>
		{:else if mode === 'sign' && !active && attrs.slotId}
			<div class="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground italic">
				<div class="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse"></div>
				Assigned to {attrs.slotId}
			</div>
		{/if}
	</div>
{/if}
