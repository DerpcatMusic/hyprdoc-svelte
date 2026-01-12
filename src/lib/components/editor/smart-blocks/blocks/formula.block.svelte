<script module lang="ts">
	import { z } from 'zod';
	import { BaseBlockSchema } from '../core/base-schema';
	import { defineBlock } from '../core/define-block';
	
	/**
	 * Formula Block Schema
	 */
	export const FormulaSchema = BaseBlockSchema.extend({
		type: z.literal('formula').default('formula'),
		value: z.number().default(0),
		expression: z.string().default(''),
		decimals: z.number().default(2),
		format: z.enum(['number', 'currency', 'percentage']).default('number'),
		currencySymbol: z.string().default('$')
	});

	/**
	 * Formula Block Definition
	 */
	export const definition = defineBlock({
		type: 'formula',
		label: 'Formula',
		category: 'logic',
		icon: 'i-lucide-calculator',
		schema: FormulaSchema
	});
</script>

<script lang="ts">
	import type { RenderContext } from '../core/types';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { useDocument } from '$lib/editor/core/editor-context';
	import { evaluateFormula } from '$lib/formula/formula-engine';
	import { cn } from '$lib/utils';

	let { attrs, mode, active }: RenderContext = $props();
	const doc = useDocument();

	// Reactively calculate variables for the engine
	const formulaVariables = $derived.by(() => {
		const vars: Record<string, number> = {};
		doc.blocks.forEach(block => {
			if (block.id && typeof block.value === 'number') {
				vars[block.id] = block.value;
			}
			// Fallback: search by variableName if block ID is not friendly
			if (block.variableName && typeof block.value === 'number') {
				vars[String(block.variableName)] = block.value;
			}
		});
		return vars;
	});

	const result = $derived(evaluateFormula(attrs.expression, formulaVariables));

	// Sync result back to attrs.value
	$effect(() => {
		if (result.success && attrs.value !== result.value) {
			attrs.value = result.value;
		}
	});
</script>

{#if mode === 'view'}
	<div class="flex justify-between items-baseline py-2 border-b-2 border-primary/10">
		<div class="flex flex-col">
			<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{attrs.label}</span>
			<span class="text-[9px] text-muted-foreground/60 font-mono">{attrs.expression}</span>
		</div>
		<div class="text-lg font-bold text-foreground">
			{#if attrs.format === 'currency'}{attrs.currencySymbol}{/if}
			{(attrs.value || 0).toFixed(attrs.decimals ?? 2)}
			{#if attrs.format === 'percentage'}%{/if}
		</div>
	</div>
{:else if mode === 'edit'}
	<div class="flex flex-col gap-3 rounded-lg border bg-card/40 p-5 transition-all shadow-sm">
		<div class="flex items-center justify-between">
			<Label for={`${attrs.id}-expr`} class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
				Calculated Formula
			</Label>
			<div class={cn(
				"flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
				result.success ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
			)}>
				<div class={cn("h-1.5 w-1.5 rounded-full", result.success ? "bg-emerald-500" : "bg-red-500")}></div>
				{result.success ? 'Valid' : 'Error'}
			</div>
		</div>

		<div class="relative">
			<div class="absolute inset-y-0 left-3 flex items-center text-muted-foreground/50 text-xs font-mono">
				f(x)
			</div>
			<Input 
				id={`${attrs.id}-expr`}
				bind:value={attrs.expression}
				placeholder="e.g. price * quantity"
				class="bg-card/30 pl-12 font-mono text-xs border-dashed"
			/>
		</div>

		{#if !result.success && result.error}
			<p class="text-[9px] text-red-400 font-medium italic animate-pulse">
				{result.error}
			</p>
		{/if}

		<div class="mt-2 flex items-baseline justify-between rounded-md bg-primary/5 p-3 border border-primary/10">
			<span class="text-[10px] font-bold text-primary/70 uppercase">Result</span>
			<div class="text-lg font-bold tracking-tight text-primary">
				{#if attrs.format === 'currency'}{attrs.currencySymbol}{/if}
				{result.value.toFixed(attrs.decimals ?? 2)}
				{#if attrs.format === 'percentage'}%{/if}
			</div>
		</div>
	</div>
{:else}
	<div class={cn(
		"flex flex-col gap-2 rounded-lg border p-4 transition-all duration-300 shadow-sm",
		active ? "bg-card border-primary/20" : "bg-muted/30 border-transparent opacity-80"
	)}>
		<div class="flex items-center justify-between">
			<div class={cn(
				"text-[10px] font-bold uppercase tracking-widest",
				active ? "text-primary" : "text-muted-foreground"
			)}>
				{attrs.label || 'Automatic Calculation'}
			</div>
			<div class="i-lucide-calculator h-3 w-3 text-muted-foreground/40"></div>
		</div>

		<div class="flex items-baseline justify-between py-1 border-b border-border/40">
			<div class="text-sm text-foreground/60 font-medium italic truncate max-w-[60%]">
				{attrs.expression || 'No formula defined'}
			</div>
			<div class="text-xl font-bold tracking-tight text-foreground">
				{#if attrs.format === 'currency'}{attrs.currencySymbol}{/if}
				{result.value.toFixed(attrs.decimals ?? 2)}
				{#if attrs.format === 'percentage'}%{/if}
			</div>
		</div>

		{#if !result.success && active}
			<p class="text-[9px] text-orange-500 font-medium">
				Waiting for inputs...
			</p>
		{/if}
	</div>
{/if}
