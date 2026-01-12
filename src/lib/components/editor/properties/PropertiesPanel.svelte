<script lang="ts">
	import { untrack } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { Settings, Edit, Users, PanelRightClose, PanelRight } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
	import { Separator } from '$lib/components/ui/separator';
	import { cn } from '$lib/utils';
	import { useDocument, useModeState } from '$lib/editor/core/editor-context';
	import { uiStore } from '$lib/stores/ui-store.svelte';

	// Panels
	import DocumentSettingsTab from './panels/DocumentSettingsTab.svelte';
	import BlockSettingsTab from './panels/BlockSettingsTab.svelte';
	import SlotManager from './panels/SlotManager.svelte';

	const doc = useDocument();
	const mode = useModeState();
	let isCollapsed = $state(false);
	
	// Tab State
	type TabType = 'global' | 'block' | 'slots';
	let activeTab = $state<TabType>('global');

	// Auto-switch to 'block' when a block is selected (if implemented in docStore)
	// $effect(() => {
	// 	if (docStore.selectedBlockId) {
	// 		activeTab = 'block';
	// 	}
	// });

	const ActivePanel = $derived.by(() => {
		switch (activeTab) {
			case 'global': return DocumentSettingsTab;
			case 'block': return BlockSettingsTab;
			case 'slots': return SlotManager;
			default: return null;
		}
	});
</script>

{#if !mode.isConsumer}
<aside
	class={cn(
		"z-20 flex min-h-0 flex-col overflow-hidden border-border bg-card transition-all duration-300 ease-in-out",
		uiStore.corporateMode
			? "h-full rounded-none border-0 border-l"
			: "m-4 h-[calc(100%-2rem)] rounded-2xl border shadow-xl backdrop-blur-xl",
		isCollapsed ? "w-20" : "w-[22rem]"
	)}
>
	<!-- Header -->
	<div class="flex shrink-0 flex-col border-border/50 border-b bg-card/50">
		<div class="flex items-center justify-between p-2">
			{#if !isCollapsed}
				<div in:fade={{ duration: 150 }} class="ml-2 font-semibold text-sm">
					Properties
				</div>
			{/if}
			
			<Button
				variant="ghost"
				size="icon"
				onclick={() => isCollapsed = !isCollapsed}
				class="bg-transparent hover:bg-muted text-muted-foreground mr-1"
				title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
			>
				{#if isCollapsed}
					<PanelRight class="size-4" />
				{:else}
					<PanelRightClose class="size-4" />
				{/if}
			</Button>
		</div>

		{#if !isCollapsed}
			<div in:fly={{ y: -10, duration: 200 }} class="px-4 pb-4">
				<Tabs value={activeTab} onValueChange={(v: string) => activeTab = v as TabType} class="w-full">
					<TabsList class="grid w-full grid-cols-3">
						<TabsTrigger value="global" class="gap-1.5 text-xs">
							<Settings class="size-3" />
							Global
						</TabsTrigger>
						<TabsTrigger value="block" class="gap-1.5 text-xs" disabled={!doc.selectedBlockId}>
							<Edit class="size-3" />
							Block
						</TabsTrigger>
						<TabsTrigger value="slots" class="gap-1.5 text-xs">
							<Users class="size-3" />
							Slots
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>
		{/if}
	</div>

	<!-- Content -->
	<div class="scrollbar-thin scrollbar-thumb-muted-foreground/20 flex-1 overflow-y-auto overflow-x-hidden">
		{#if !isCollapsed && ActivePanel}
			{#key activeTab}
				<div in:fly={{ x: 10, duration: 200, delay: 50 }} out:fade={{ duration: 100 }} class="h-full">
					<ActivePanel />
				</div>
			{/key}
		{/if}
	</div>

</aside>
{/if}
