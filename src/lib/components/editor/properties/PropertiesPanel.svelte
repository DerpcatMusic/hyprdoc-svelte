<script lang="ts">
	import { PanelRight, PanelRightClose, FileText, LayoutGrid, Users } from "lucide-svelte";
	import { fly, fade } from "svelte/transition";
	import { Button } from "$lib/components/ui/button";
	import { cn } from "$lib/utils";
	import { uiStore } from "$lib/stores/ui-store.svelte";
	import DocumentProperties from "$lib/components/editor/properties/DocumentProperties.svelte";
	import BlockPropertiesTab from "$lib/components/editor/properties/BlockPropertiesTab.svelte";
	import PartiesTab from "$lib/components/editor/properties/PartiesTab.svelte";

	const { isCorporate = false } = $props();

	type TabId = "document" | "block" | "parties";
	
	let isCollapsed = $state(false);
	const activeTab = $derived(uiStore.propertiesTab);

	const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
		{ id: "document", label: "Doc", icon: FileText },
		{ id: "block", label: "Block", icon: LayoutGrid },
		{ id: "parties", label: "Parties", icon: Users },
	];
</script>

<aside
	class={cn(
		"z-20 flex min-h-0 flex-col overflow-hidden border-border/70 bg-sidebar/95 text-sidebar-foreground backdrop-blur-xl transition-all duration-300 supports-[backdrop-filter]:bg-sidebar/80",
		isCorporate || uiStore.corporateMode.current
			? "h-full rounded-none border-0 border-l"
			: "h-full rounded-none border-l shadow-[-10px_0_24px_-18px_rgba(0,0,0,0.45)]",
		isCollapsed ? "w-14" : "w-[22rem]"
	)}
>
	<!-- Header -->
	<div class="flex shrink-0 flex-col border-b border-border/40 bg-gradient-to-b from-sidebar via-sidebar to-muted/20">
		<div class="flex items-center justify-between p-2.5">
			{#if !isCollapsed}
				<div in:fade={{ duration: 150 }} class="ml-1">
					<p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Inspector</p>
					<h2 class="font-semibold text-sm text-foreground">Properties</h2>
				</div>
			{/if}
			<Button
				variant="ghost"
				size="icon"
				onclick={() => (isCollapsed = !isCollapsed)}
				class="ml-auto shrink-0 text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg"
				title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
			>
				<div class="transition-transform duration-300" style:transform={isCollapsed ? "rotate(180deg)" : "rotate(0deg)"}>
					{#if isCollapsed}
						<PanelRight class="size-4" />
					{:else}
						<PanelRightClose class="size-4" />
					{/if}
				</div>
			</Button>
		</div>

		<!-- Tab Bar -->
		{#if !isCollapsed}
			<div in:fade={{ duration: 150 }} class="flex items-center gap-1 px-2 pb-2">
				{#each tabs as tab (tab.id)}
					<button
						type="button"
						onclick={() => uiStore.setPropertiesTab(tab.id)}
						class={cn(
							"flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all",
							activeTab === tab.id
								? "bg-primary text-primary-foreground shadow-sm"
								: "text-muted-foreground hover:bg-muted hover:text-foreground"
						)}
					>
						<tab.icon class="size-3" />
						{tab.label}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Content -->
	{#if !isCollapsed}
		<div in:fly={{ x: 20, duration: 250, delay: 50 }} class="flex-1 overflow-hidden">
			{#if activeTab === "document"}
				<DocumentProperties />
			{:else if activeTab === "block"}
				<BlockPropertiesTab />
			{:else if activeTab === "parties"}
				<PartiesTab />
			{/if}
		</div>
	{/if}
</aside>
