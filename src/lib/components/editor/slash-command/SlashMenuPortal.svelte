<!--
  SlashMenuPortal - Global portal component for slash menu
  
  Uses RUNED useEventListener for keyboard handling with automatic cleanup.
  Renders when slashMenuState.isOpen is true.
  Mounted once at app/editor level.
-->
<script lang="ts">
	import { useEventListener } from 'runed';
	import { slashMenuState, type CommandItem } from './SlashMenuState.svelte';

	// Handle keyboard events via RUNED (auto-cleanup on unmount)
	useEventListener(
		() => document,
		'keydown',
		(event: KeyboardEvent) => {
			slashMenuState.handleKeyDown(event);
		},
		{ capture: true }
	);

	// Scroll selected item into view
	let menuContainer = $state<HTMLDivElement>();
	
	$effect(() => {
		if (menuContainer && slashMenuState.isOpen && slashMenuState.filteredItems.length > 0) {
			const selectedItem = menuContainer.querySelector(`[data-index="${slashMenuState.selectedIndex}"]`);
			selectedItem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	});

	function handleItemClick(item: CommandItem) {
		slashMenuState.selectItem(item);
	}

	function handleMouseEnter(index: number) {
		slashMenuState.selectedIndex = index;
	}
</script>

{#if slashMenuState.isOpen}
	<div
		class="fixed z-[9999]"
		style:left="{slashMenuState.position.x}px"
		style:top={slashMenuState.position.placement === 'above' ? 'auto' : `${slashMenuState.position.y}px`}
		style:bottom={slashMenuState.position.placement === 'above' ? `${window.innerHeight - slashMenuState.position.y}px` : 'auto'}
	>
		<div
			bind:this={menuContainer}
			class="max-h-[300px] min-w-[320px] overflow-hidden overflow-y-auto scroll-smooth rounded-lg border border-border bg-popover text-popover-foreground shadow-xl"
		>
			<!-- Header -->
			<div class="sticky top-0 z-10 border-b border-border bg-muted px-3 py-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
				Blocks
			</div>

			<!-- Items -->
			{#if slashMenuState.filteredItems.length > 0}
				{#each slashMenuState.filteredItems as item, index (item.type + '-' + item.title)}
					<button
						type="button"
						data-index={index}
						class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors cursor-pointer
							{index === slashMenuState.selectedIndex 
								? 'bg-primary/10 text-primary' 
								: 'text-popover-foreground hover:bg-muted'}"
						onclick={() => handleItemClick(item)}
						onmouseenter={() => handleMouseEnter(index)}
					>
						<!-- Icon -->
						<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded border
							{index === slashMenuState.selectedIndex 
								? 'border-primary/30 bg-background text-primary' 
								: 'border-border bg-muted text-muted-foreground'}"
						>
							<span class="{item.icon} size-4"></span>
						</div>
						
						<!-- Text -->
						<div class="flex flex-col gap-0.5 overflow-hidden">
							<span class="font-medium truncate">{item.title}</span>
							<span class="text-xs text-muted-foreground truncate opacity-80">{item.description}</span>
						</div>
					</button>
				{/each}
			{:else}
				<div class="px-4 py-6 text-center text-sm text-muted-foreground">
					No results found
				</div>
			{/if}
		</div>
	</div>
{/if}
