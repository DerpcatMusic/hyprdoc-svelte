<script lang="ts">
import type { Snippet } from 'svelte';
import { page } from '$app/state';
import AppSidebar from '$lib/components/layout/AppSidebar.svelte';
import { SidebarInset, SidebarProvider } from '$lib/components/ui/sidebar';
import { modeToggle, uiStore } from '$lib/stores/ui-store.svelte';
import { cn } from '$lib/utils';
import type { LayoutData } from './$types';

interface Props {
	data: LayoutData;
	children: Snippet;
}

const { data, children }: Props = $props();

let sidebarOpen = $state(true);

// Sync activeView with URL for direct navigation
$effect(() => {
	const path = page.url.pathname;
	if (path.includes('/settings')) { uiStore.setDashboardView('settings'); }
	else if (path.includes('/signed')) { uiStore.setDashboardView('signed'); }
	else if (path.includes('/envelopes')) { uiStore.setDashboardView('envelopes'); }
	else if (path.includes('/dashboard')) { uiStore.setDashboardView('templates'); }
});

// Force sidebar open in Corporate Mode
$effect(() => {
	if (modeToggle.isCorporate) {
		sidebarOpen = true;
	}
});

function handleViewChange(view: 'templates' | 'envelopes' | 'signed' | 'settings') {
	uiStore.setDashboardView(view);
	// View switching is handled within the dashboard page, not via navigation
}

function handleCreate() {
	// Dispatch event for dashboard to handle
	window.dispatchEvent(new CustomEvent('dashboard:create'));
}

function handleImport() {
	uiStore.openImportPicker();
}
</script>

<SidebarProvider defaultOpen={true} bind:open={sidebarOpen}>
	{#if !page.url.pathname.includes('/editor/')}
		<AppSidebar
			activeView={uiStore.dashboardView}
			onViewChange={handleViewChange}
			onCreate={handleCreate}
			onImport={handleImport}
			user={data.user}
		/>
	{/if}
	<SidebarInset
		class={cn(
			'transition-colors duration-500',
			modeToggle.isCorporate ? 'bg-background' : 'bg-transparent'
		)}
	>
		<div class="min-h-screen transition-colors duration-300">{@render children()}</div>
	</SidebarInset>
</SidebarProvider>
