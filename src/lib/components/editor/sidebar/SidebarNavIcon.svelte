<script lang="ts">
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';
	import type { ComponentType } from 'svelte';

	interface Props {
		icon: ComponentType;
		label: string;
		isActive: boolean;
		variant: 'creative' | 'scientific' | 'serious' | 'neutral' | 'magic';
		onclick: () => void;
	}

	const { icon: Icon, label, isActive, variant, onclick }: Props = $props();

	const VARIANTS = {
		creative: {
			active: "bg-background border border-violet-500/50 text-violet-500",
			hover: "hover:bg-muted/50 hover:text-foreground",
			inactive: "text-muted-foreground border border-transparent",
		},
		scientific: {
			active: "bg-background border border-orange-500/50 text-orange-500",
			hover: "hover:bg-muted/50 hover:text-foreground",
			inactive: "text-muted-foreground border border-transparent",
		},
		serious: {
			active: "bg-background border border-blue-500/50 text-blue-500",
			hover: "hover:bg-muted/50 hover:text-foreground",
			inactive: "text-muted-foreground border border-transparent",
		},
		neutral: {
			active: "bg-background border border-border text-foreground",
			hover: "hover:bg-muted/50 hover:text-foreground",
			inactive: "text-muted-foreground border border-transparent",
		},
		magic: {
			// Special gradient variant for AI
			active: "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white border-transparent shadow-lg shadow-fuchsia-500/20",
			hover: "hover:scale-105 hover:shadow-xl hover:shadow-fuchsia-500/30",
			inactive: "bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 text-fuchsia-600 border border-fuchsia-200/50 hover:bg-gradient-to-br hover:from-indigo-500 hover:to-fuchsia-500 hover:text-white transition-all duration-300",
		}
	};

	const theme = $derived(VARIANTS[variant]);
</script>

<Tooltip>
	<TooltipTrigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				{onclick}
				class={cn(
					"flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200",
					isActive ? theme.active : cn(theme.inactive, theme.hover)
				)}
			>
				<Icon class="size-5" />
			</button>
		{/snippet}
	</TooltipTrigger>
	<TooltipContent side="right" class="ml-2 font-medium">
		<p>{label}</p>
	</TooltipContent>
</Tooltip>
