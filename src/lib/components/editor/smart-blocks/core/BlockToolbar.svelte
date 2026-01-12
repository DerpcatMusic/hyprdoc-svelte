<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '$lib/components/ui/tooltip';

interface Props {
	label: string;
	required?: boolean;
	slotColor: string;
	onLabelChange: (value: string) => void;
	onRequiredToggle: () => void;
	onDelete: () => void;
}

const {
	label,
	required = false,
	slotColor,
	onLabelChange,
	onRequiredToggle,
	onDelete
}: Props = $props();
</script>

<TooltipProvider>
<div
	class="absolute -top-10 left-0 right-0 z-10 flex items-center gap-1 rounded-t-lg border border-border bg-background/95 p-1.5 shadow-sm backdrop-blur-sm"
	style:border-left-color={slotColor}
	style:border-left-width="3px"
>
	<Input
		type="text"
		value={label}
		oninput={(e: any) => onLabelChange((e.target as HTMLInputElement).value)}
		class="h-7 flex-1 border-none bg-transparent px-2 text-sm font-medium shadow-none focus-visible:ring-0"
		placeholder="Field label"
	/>

	<Tooltip>
		<TooltipTrigger>
			{#snippet child({ props })}
				<Button
					variant="ghost"
					size="icon"
					onclick={onRequiredToggle}
					class="h-7 w-7 {required ? 'text-destructive' : 'text-muted-foreground'}"
					{...props}
				>
					<span class="i-lucide-asterisk h-3.5 w-3.5"></span>
				</Button>
			{/snippet}
		</TooltipTrigger>
		<TooltipContent>{required ? 'Required field' : 'Optional field'}</TooltipContent>
	</Tooltip>

	<Tooltip>
		<TooltipTrigger>
			{#snippet child({ props })}
				<Button
					variant="ghost"
					size="icon"
					onclick={onDelete}
					class="h-7 w-7 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
					{...props}
				>
					<span class="i-lucide-trash-2 h-3.5 w-3.5"></span>
				</Button>
			{/snippet}
		</TooltipTrigger>
		<TooltipContent>Delete block</TooltipContent>
	</Tooltip>
</div>
</TooltipProvider>
