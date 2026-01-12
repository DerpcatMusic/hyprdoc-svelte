<script module lang="ts">
	import { z } from 'zod';
	import { BaseBlockSchema } from '../core/base-schema';
	import { defineBlock } from '../core/define-block';
	
	/**
	 * Smart Email Block Schema
	 */
	export const SmartEmailSchema = BaseBlockSchema.extend({
		type: z.literal('smart-email').default('smart-email'),
		value: z.string().email().or(z.literal('')).default(''),
		placeholder: z.string().default('example@email.com')
	});

	/**
	 * Smart Email Block Definition
	 */
	export const definition = defineBlock({
		type: 'smart-email',
		label: 'Smart Email',
		category: 'inputs',
		icon: 'i-lucide-mail',
		schema: SmartEmailSchema
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
			"text-sm font-medium border-b border-dotted border-primary/30 pb-0.5 min-h-[1.5rem] flex items-center gap-2",
			attrs.value ? "text-foreground" : "text-muted-foreground italic font-normal"
		)}>
			{#if attrs.value}
				<div class="i-lucide-mail size-3 text-primary/60"></div>
				{attrs.value}
			{:else}
				None provided
			{/if}
		</div>
	</div>
{:else}
	<div 
		class={cn(
			"flex flex-col gap-2 rounded-lg border p-4 transition-all duration-300",
			mode === 'edit' ? "bg-card/30 border-border" : (active ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-muted/30 border-transparent opacity-60")
		)}
	>
		<Label 
			for={attrs.id}
			class={cn(
				"text-[10px] font-bold uppercase tracking-widest",
				(mode === 'edit' || active) ? "text-primary" : "text-muted-foreground"
			)}
		>
			{attrs.label || (mode === 'edit' ? 'Email Address' : 'Smart Email')}
		</Label>

		<div class="relative">
			<div class={cn(
				"absolute left-3 top-1/2 -translate-y-1/2 i-lucide-at-sign size-3.5",
				(mode === 'edit' || active) ? "text-primary/60" : "text-muted-foreground/40"
			)}></div>
			<Input 
				id={attrs.id}
				type="email"
				bind:value={attrs.value}
				placeholder={attrs.placeholder}
				disabled={mode === 'sign' && !active}
				class={cn(
					"pl-9 transition-all",
					mode === 'edit' ? "bg-card/50" : (active ? "bg-card border-primary/20 ring-primary/10" : "bg-muted/50 border-transparent")
				)}
			/>
		</div>

		{#if mode === 'edit' && attrs.description}
			<p class="text-[10px] text-muted-foreground italic">
				{attrs.description}
			</p>
		{:else if mode === 'sign' && !active && attrs.slotId}
			<div class="mt-1 text-[9px] text-muted-foreground italic flex items-center gap-1.5 font-medium">
				<div class="h-1 w-1 rounded-full bg-primary/40"></div>
				Required for: {attrs.slotId}
			</div>
		{/if}
	</div>
{/if}
