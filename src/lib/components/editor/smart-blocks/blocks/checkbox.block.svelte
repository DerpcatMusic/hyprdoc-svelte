<script module lang="ts">
	import { z } from 'zod';
	import { BaseBlockSchema } from '../core/base-schema';
	import { defineBlock } from '../core/define-block';
	
	/**
	 * Checkbox Block Schema
	 */
	export const CheckboxSchema = BaseBlockSchema.extend({
		type: z.literal('checkbox').default('checkbox'),
		value: z.boolean().default(false),
		label: z.string().default('Checkbox Field')
	});

	/**
	 * Checkbox Block Definition
	 */
	export const definition = defineBlock({
		type: 'checkbox',
		label: 'Checkbox',
		category: 'inputs',
		icon: 'i-lucide-check-square',
		schema: CheckboxSchema
	});
</script>

<script lang="ts">
	import type { RenderContext } from '../core/types';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { cn } from '$lib/utils';
	import CheckIcon from "lucide-svelte/icons/check";

	let { attrs, mode, active, activeSlotId }: RenderContext = $props();
</script>

{#if mode === 'view'}
	<div class="flex items-center gap-2 py-1">
		<div class={cn(
			"flex size-5 items-center justify-center rounded border transition-colors",
			attrs.value ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-muted-foreground/20 text-muted-foreground/50"
		)}>
			{#if attrs.value}
				<CheckIcon class="size-3.5" strokeWidth={3} />
			{/if}
		</div>
		<span class={cn(
			"text-sm transition-colors",
			attrs.value ? "font-medium text-foreground" : "text-muted-foreground"
		)}>
			{attrs.label}
		</span>
	</div>
{:else}
	<div 
		class={cn(
			"flex items-center gap-3 space-x-2 rounded-lg border p-3 transition-all duration-300",
			mode === 'edit' ? "bg-card/30 border-border hover:bg-card/50" : (active ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-muted/30 border-transparent opacity-60 grayscale-[0.5]")
		)}
	>
		<Checkbox 
			id={attrs.id} 
			bind:checked={attrs.value} 
			disabled={mode === 'sign' && !active}
			class={cn(
				"size-5",
				active && "ring-2 ring-primary/20"
			)}
		/>
		<div class="grid gap-1.5 leading-none">
			<Label
				for={attrs.id}
				class={cn(
					"text-sm transition-colors",
					(mode === 'edit' || active) ? "font-medium text-foreground" : "text-muted-foreground"
				)}
			>
				{attrs.label || 'Checkbox Field'}
			</Label>
			{#if mode === 'edit' && attrs.description}
				<p class="text-xs text-muted-foreground">
					{attrs.description}
				</p>
			{:else if mode === 'sign' && !active && attrs.slotId}
				<p class="text-[10px] text-muted-foreground italic">
					Assigned to {attrs.slotId}
				</p>
			{/if}
		</div>
	</div>
{/if}
