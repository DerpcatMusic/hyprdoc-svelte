<script lang="ts">
	import { PanelRight, PanelRightClose } from "lucide-svelte";
	import { fly, fade } from "svelte/transition";
	import { Button } from "$lib/components/ui/button";
	import { cn } from "$lib/utils";
	import { uiStore } from "$lib/stores/ui-store.svelte";
	import DocumentProperties from "$lib/components/editor/properties/DocumentProperties.svelte";

	const { isCorporate = false } = $props();

	let isCollapsed = $state(false);
</script>

<aside
	class={cn(
		"z-20 flex min-h-0 flex-col overflow-hidden border-border bg-card text-card-foreground transition-all duration-300",
		isCorporate || uiStore.corporateMode.current
			? "h-full rounded-none border-0 border-l"
			: "m-4 h-[calc(100%-2rem)] rounded-2xl border shadow-xl",
		isCollapsed ? "w-14" : "w-[22rem]"
	)}
>
	<!-- Header -->
	<div class="flex shrink-0 flex-col border-border/50 border-b bg-card/50">
		<div class="flex items-center justify-between p-2">
			{#if !isCollapsed}
				<h2 in:fade={{ duration: 150 }} class="ml-2 font-bold text-xs uppercase tracking-widest text-muted-foreground">
					Properties
				</h2>
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
	</div>

	<!-- Content -->
	{#if !isCollapsed}
		<div in:fly={{ x: 20, duration: 250, delay: 50 }} class="flex-1 overflow-hidden">
			<DocumentProperties />
		</div>
	{/if}
</aside>
