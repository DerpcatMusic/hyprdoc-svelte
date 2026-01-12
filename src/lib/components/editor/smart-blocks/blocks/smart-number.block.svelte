<script module lang="ts">
	import { z } from 'zod';
	import { BaseBlockSchema } from '../core/base-schema';
	import { defineBlock } from '../core/define-block';
	
	/**
	 * Smart Number Block Schema
	 */
	export const SmartNumberSchema = BaseBlockSchema.extend({
		type: z.literal('smart-number').default('smart-number'),
		value: z.number().nullable().default(null),
		min: z.number().default(0),
		max: z.number().default(100),
		step: z.number().default(1)
	});

	/**
	 * Smart Number Block Definition
	 */
	export const definition = defineBlock({
		type: 'smart-number',
		label: 'Smart Number',
		category: 'inputs',
		icon: 'i-lucide-binary',
		schema: SmartNumberSchema
	});
</script>

<script lang="ts">
	import type { RenderContext } from '../core/types';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { cn } from '$lib/utils';

	let { attrs, mode, active }: RenderContext = $props();
</script>

{#if mode === 'view'}
	<div class="flex flex-col gap-1 py-1">
		<div class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
			{attrs.label}
		</div>
		<div class={cn(
			"text-sm font-bold border-b-2 border-primary/20 pb-0.5 min-h-[1.5rem] font-mono",
			attrs.value !== null ? "text-foreground" : "text-muted-foreground italic font-normal"
		)}>
			{attrs.value !== null ? attrs.value : 'None'}
		</div>
	</div>
{:else}
	<div 
		class={cn(
			"flex flex-col gap-2 rounded-lg border p-4 transition-all duration-300",
			mode === 'edit' ? "bg-card/30 border-border" : (active ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-muted/30 border-transparent opacity-60")
		)}
	>
		<div class="flex justify-between items-center">
			<Label 
				for={attrs.id}
				class={cn(
					"text-[10px] font-bold uppercase tracking-widest",
					(mode === 'edit' || active) ? "text-primary" : "text-muted-foreground"
				)}
			>
				{attrs.label || (mode === 'edit' ? 'Number Field' : 'Smart Number')}
			</Label>
			{#if mode === 'edit' || active}
				<span class="text-[9px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
					{attrs.min}..{attrs.max}
				</span>
			{/if}
		</div>

		<Input 
			id={attrs.id}
			type="number"
			bind:value={attrs.value}
			min={attrs.min}
			max={attrs.max}
			step={attrs.step}
			disabled={mode === 'sign' && !active}
			class={cn(
				"transition-all font-mono",
				mode === 'edit' ? "bg-card/50" : (active ? "bg-card border-primary/20 ring-primary/10" : "bg-muted/50 border-transparent")
			)}
		/>

		{#if mode === 'edit' && attrs.description}
			<p class="text-[10px] text-muted-foreground italic">
				{attrs.description}
			</p>
		{:else if mode === 'sign' && !active && attrs.slotId}
			<div class="mt-1 text-[9px] text-muted-foreground italic flex items-center gap-1.5 font-medium">
				<div class="h-1 w-1 rounded-full bg-primary/40"></div>
				Required from: {attrs.slotId}
			</div>
		{/if}
	</div>
{/if}
