<script lang="ts">
import { Label } from '$lib/components/ui/label';
import { cn } from '$lib/utils';

interface Props {
	label?: string;
	required?: boolean;
	error?: string | null;
	class?: string;
	children: import('svelte').Snippet;
	icon?: import('svelte').Snippet;
	slotColor?: string;
	description?: string;
}

const {
	label,
	required,
	error,
	class: className,
	children,
	icon,
	slotColor,
	description
}: Props = $props();
</script>

<div class={cn("group flex flex-col gap-1.5 w-full", className)}>
	{#if label}
		<div class="flex items-center justify-between">
			<Label class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
				{#if icon}
					<div class="text-primary/60">
						{@render icon()}
					</div>
				{/if}
				{label}
				{#if required}
					<span class="text-destructive ml-0.5">*</span>
				{/if}
			</Label>
		</div>
	{/if}

	<div
		class={cn(
			"relative rounded-md transition-all duration-200",
			slotColor ? ` ring-1 ring-offset-1 ring-${slotColor}/30` : "",
			error ? "ring-1 ring-destructive/50 ring-offset-1" : ""
		)}
	>
		{@render children()}
	</div>

	{#if description && !error}
		<p class="text-[10px] text-muted-foreground/60 leading-relaxed px-0.5 italic">{description}</p>
	{/if}

	{#if error}
		<p
			class="text-[10px] font-medium text-destructive animate-in fade-in slide-in-from-top-1 px-0.5"
		>
			{error}
		</p>
	{/if}
</div>
