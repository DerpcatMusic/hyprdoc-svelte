<script module lang="ts">
	import { z } from 'zod';
	import { BaseBlockSchema } from '../core/base-schema';
	import { defineBlock } from '../core/define-block';
	
	/**
	 * Signature Block Schema
	 */
	export const SignatureSchema = BaseBlockSchema.extend({
		type: z.literal('signature').default('signature'),
		value: z.string().nullable().default(null),
		signedAt: z.string().nullable().default(null)
	});

	/**
	 * Signature Block Definition
	 */
	export const definition = defineBlock({
		type: 'signature',
		label: 'Signature',
		category: 'compliance',
		icon: 'i-lucide-signature',
		schema: SignatureSchema
	});
</script>

<script lang="ts">
	import type { RenderContext } from '../core/types';
	import SignaturePad from '$lib/components/ui/signature/SignaturePad.svelte';
	import { cn } from '$lib/utils';
	import { fade } from 'svelte/transition';

	let { attrs, mode, active }: RenderContext = $props();

	function onSign(data: string | null) {
		attrs.value = data;
		if (data) {
			attrs.signedAt = new Date().toISOString();
		} else {
			attrs.signedAt = null;
		}
	}
</script>

{#if mode === 'view'}
	<div class="flex flex-col items-center gap-2 py-4">
		{#if attrs.value}
			<div class="relative w-full max-w-sm">
				<img src={attrs.value} alt="Signature" class="mx-auto max-h-24 object-contain brightness-0 dark:invert" />
				<div class="absolute inset-0 bg-primary/5 rounded-lg border border-primary/20 pointer-events-none"></div>
			</div>
			<div class="flex w-full max-w-sm justify-between px-1">
				<span class="text-[9px] font-bold text-muted-foreground uppercase">{attrs.label}</span>
				{#if attrs.signedAt}
					<span class="text-[9px] font-mono text-muted-foreground/60">
						{new Date(attrs.signedAt).toLocaleDateString()}
					</span>
				{/if}
			</div>
		{:else}
			<div class="flex h-20 w-full max-w-sm items-center justify-center rounded border border-dashed text-[10px] text-muted-foreground italic">
				Not yet signed
			</div>
		{/if}
	</div>
{:else if mode === 'edit'}
	<div class="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed bg-card/20 p-8 transition-colors hover:border-primary/30">
		<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
			<div class="i-lucide-signature h-6 w-6"></div>
		</div>
		
		<div class="text-center">
			<div class="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
				{attrs.label || 'Signature Field'}
			</div>
			<p class="mt-1 text-[10px] text-muted-foreground italic">
				{attrs.slotId ? `Assigned to: ${attrs.slotId}` : 'Not assigned to a signer'}
			</p>
		</div>

		<div class="h-px w-32 bg-border/50"></div>
	</div>
{:else}
	<div 
		class={cn(
			"flex flex-col gap-3 rounded-xl border p-4 transition-all duration-300",
			active ? "bg-card border-primary/20 shadow-md ring-1 ring-primary/5" : "bg-muted/30 border-transparent opacity-60 grayscale-[0.5]"
		)}
	>
		<div class="flex items-center justify-between">
			<div class={cn(
				"text-[10px] font-bold uppercase tracking-[0.2em]",
				active ? "text-primary" : "text-muted-foreground"
			)}>
				{attrs.label || 'Digital Signature'}
			</div>
			{#if active && attrs.value}
				<div class="flex items-center gap-1.5 text-[9px] text-emerald-500 font-bold uppercase" transition:fade>
					<div class="i-lucide-check-circle h-3 w-3"></div>
					Signed
				</div>
			{/if}
		</div>

		{#if active}
			<SignaturePad 
				bind:value={attrs.value} 
				onchange={onSign}
				placeholder="Sign with your trackpad or mouse"
				class="bg-card/80 border-primary/10"
			/>
		{:else}
			<div class="flex h-40 w-full items-center justify-center rounded-md border-2 border-dashed bg-muted/20">
				{#if attrs.value}
					<img src={attrs.value} alt="Signature" class="max-h-32 object-contain" />
				{:else}
					<div class="flex flex-col items-center gap-2 text-muted-foreground/30 italic">
						<div class="i-lucide-signature size-5 text-muted-foreground/30"></div>
						<span class="text-[10px]">Awaiting {attrs.slotId || 'signer'}</span>
					</div>
				{/if}
			</div>
		{/if}

		{#if attrs.description && active}
			<p class="text-[9px] text-muted-foreground/60 leading-relaxed italic">
				{attrs.description}
			</p>
		{/if}
	</div>
{/if}
