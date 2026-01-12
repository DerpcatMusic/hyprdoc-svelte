<script module lang="ts">
	import { z } from 'zod';
	import { BaseBlockSchema } from '../core/base-schema';
	import { defineBlock } from '../core/define-block';
	
	/**
	 * Data Grid Block Schema
	 */
	export const DataGridSchema = BaseBlockSchema.extend({
		type: z.literal('data-grid').default('data-grid'),
		value: z.array(z.record(z.string(), z.any())).default([]),
		columns: z.array(z.object({
			id: z.string(),
			label: z.string(),
			type: z.enum(['text', 'number', 'currency']).default('text')
		})).default([
			{ id: 'item', label: 'Item', type: 'text' },
			{ id: 'qty', label: 'Qty', type: 'number' },
			{ id: 'price', label: 'Price', type: 'currency' }
		])
	});

	/**
	 * Data Grid Block Definition
	 */
	export const definition = defineBlock({
		type: 'data-grid',
		label: 'Data Table',
		category: 'layout',
		icon: 'i-lucide-table-2',
		schema: DataGridSchema
	});
</script>

<script lang="ts">
	import type { RenderContext } from '../core/types';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';

	let { attrs, mode, active }: RenderContext = $props();

	function addRow() {
		const newRow: Record<string, any> = {};
		attrs.columns.forEach((col: { id: string; type: string }) => {
			newRow[col.id] = col.type === 'number' || col.type === 'currency' ? 0 : '';
		});
		attrs.value = [...(attrs.value || []), newRow];
	}

	function removeRow(index: number) {
		attrs.value = attrs.value.filter((_: unknown, i: number) => i !== index);
	}
</script>

{#if mode === 'view'}
	<div class="mt-2 overflow-hidden rounded-lg border shadow-sm">
		<Table.Root>
			<Table.Header class="bg-muted/40">
				<Table.Row>
					{#each attrs.columns as col}
						<Table.Head class="text-[10px] font-bold uppercase text-foreground/70 h-10 px-4">
							{col.label}
						</Table.Head>
					{/each}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each attrs.value || [] as row}
					<Table.Row class="hover:bg-muted/10 transition-colors border-b last:border-0">
						{#each attrs.columns as col}
							<Table.Cell class="px-4 py-2.5 text-sm font-medium text-foreground/90">
								{#if col.type === 'currency'}
									<span class="text-xs text-muted-foreground mr-0.5">$</span>{Number(row[col.id]).toFixed(2)}
								{:else if col.type === 'number'}
									{row[col.id]}
								{:else}
									{row[col.id] || '—'}
								{/if}
							</Table.Cell>
						{/each}
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{:else}
	<div 
		class={cn(
			"flex flex-col gap-4 rounded-xl border p-4 transition-all duration-300",
			mode === 'edit' ? "bg-card/30 border-border shadow-sm" : (active ? "bg-card border-primary/20 shadow-md" : "bg-muted/30 border-transparent opacity-80")
		)}
	>
		<div class="flex items-center justify-between px-1">
			<div class={cn(
				"text-[10px] font-bold uppercase tracking-[0.2em]",
				(mode === 'edit' || active) ? "text-primary" : "text-muted-foreground"
			)}>
				{attrs.label || 'Data Table'}
			</div>
			{#if mode === 'edit' || active}
				<Button variant="outline" size="sm" class="h-7 px-2 text-[9px] font-bold uppercase" onclick={addRow} aria-label="Add Row">
					<div class="i-lucide-plus mr-1 size-3"></div>
					{mode === 'edit' ? 'Add Row' : 'Add Entry'}
				</Button>
			{/if}
		</div>

		<div class="overflow-hidden rounded-lg border bg-background/50">
			<Table.Root>
				<Table.Header class="bg-muted/30">
					<Table.Row>
						{#each attrs.columns as col}
							<Table.Head class="text-[9px] font-bold uppercase tracking-wider h-8 px-3">
								{col.label}
							</Table.Head>
						{/each}
						{#if mode === 'edit' || active}
							<Table.Head class="w-10 h-8" />
						{/if}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each attrs.value || [] as row, rowIndex}
						<Table.Row class="hover:bg-muted/10 transition-colors">
							{#each attrs.columns as col}
								<Table.Cell class="p-1 px-3">
									{#if mode === 'edit' || active}
										<Input 
											type={col.type === 'text' ? 'text' : 'number'}
											bind:value={row[col.id]}
											class="h-7 text-xs bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/20"
											aria-label={`${col.label} for row ${rowIndex + 1}`}
										/>
									{:else}
										<span class="text-xs font-medium text-foreground/80">
											{col.type === 'currency' ? '$' : ''}{row[col.id]}
										</span>
									{/if}
								</Table.Cell>
							{/each}
							{#if mode === 'edit' || active}
								<Table.Cell class="p-1 text-center">
									<Button 
										variant="ghost" 
										size="icon" 
										class="h-6 w-6 text-muted-foreground/40 hover:text-red-500 transition-colors"
										onclick={() => removeRow(rowIndex)}
										aria-label={`Remove row ${rowIndex + 1}`}
									>
										<div class="i-lucide-trash-2 size-3"></div>
									</Button>
								</Table.Cell>
							{/if}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</div>
{/if}
