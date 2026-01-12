<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from '$lib/components/ui/sidebar';
import { modeToggle } from '$lib/stores/ui-store.svelte';
import { cn } from '$lib/utils';

type ViewId = 'templates' | 'envelopes' | 'signed' | 'settings';

interface Props {
	activeView: ViewId;
	onViewChange: (view: ViewId) => void;
	onCreate?: () => void;
	onImport?: () => void;
	user?: { firstName?: string | null; email?: string | null } | null;
}

const { activeView, onViewChange, onCreate, onImport, user }: Props = $props();

const navItems = [
	{ id: 'templates' as const, label: 'My Templates', iconClass: 'i-lucide-file-text' },
	{ id: 'envelopes' as const, label: 'Sent Envelopes', iconClass: 'i-lucide-mail' },
	{ id: 'signed' as const, label: 'Signed by Me', iconClass: 'i-lucide-check-circle' },
	{ id: 'settings' as const, label: 'Settings', iconClass: 'i-lucide-settings-2' }
];

const { isCorporate, toggleCorporate, isDark, toggleTheme } = modeToggle;
</script>

<Sidebar variant={isCorporate ? 'sidebar' : 'floating'} collapsible="icon">
	<SidebarHeader class="p-4">
		<!-- App Logo -->
		<div class="mb-6 flex items-center gap-3 px-2">
			<div class="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 shadow-sm">
				<img src="/logo.svg" alt="HyprDoc Logo" class="h-6 w-6 dark:invert">
			</div>
			<div class="flex flex-col">
				<span class="font-bold text-base leading-none tracking-tight">HyprDoc.</span>
				<span class="mt-1 text-[10px] text-muted-foreground uppercase tracking-widest">
					{isCorporate ? 'Corporate Edition' : 'Creative Engine'}
				</span>
			</div>
		</div>

		<!-- Primary Actions -->
		<div class="flex flex-col gap-2 px-2">
			<SidebarMenuButton
				onclick={onCreate}
				class="h-11 w-full justify-start rounded-xl bg-primary px-3 font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all duration-300"
			>
				<span class="i-lucide-plus mr-2 w-5 h-5"></span>
				<span class="font-display tracking-wide uppercase text-xs">New Template</span>
			</SidebarMenuButton>

			<div class="grid grid-cols-2 gap-2">
				<SidebarMenuButton
					onclick={onImport}
					class="h-11 justify-center rounded-xl border border-input bg-card p-0 hover:bg-accent hover:text-accent-foreground"
				>
					<span class="i-lucide-file-up mr-2 w-4 h-4"></span>
					<span class="font-medium text-xs">PDF</span>
				</SidebarMenuButton>

				<SidebarMenuButton
					onclick={() => goto('/sign/quick')}
					class="h-11 justify-center rounded-xl border border-input bg-card p-0 hover:bg-accent hover:text-accent-foreground"
				>
					<span class="i-lucide-pen-line mr-2 w-4 h-4"></span>
					<span class="font-medium text-xs">Sign</span>
				</SidebarMenuButton>
			</div>
		</div>
	</SidebarHeader>

	<SidebarContent>
		<SidebarGroup>
			<SidebarGroupLabel>Navigation</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{#each navItems as item (item.id)}
						<SidebarMenuItem>
							<SidebarMenuButton
								isActive={activeView === item.id}
								onclick={() => onViewChange(item.id)}
								class={cn(
									'h-10 transition-all duration-200',
									activeView === item.id
										? 'bg-primary/10 font-bold text-primary'
										: 'text-muted-foreground hover:bg-muted/50'
								)}
							>
								<span
									class={cn(
										item.iconClass,
										'w-4 h-4 shrink-0',
										activeView === item.id ? 'text-primary' : 'text-muted-foreground'
									)}
								></span>
								<span>{item.label}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					{/each}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	</SidebarContent>

	<SidebarFooter class="p-4">
		<div class="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 p-2">
			<!-- Toggles -->
			<div class="flex items-center justify-between gap-1">
				<SidebarMenuButton
					onclick={toggleTheme}
					class="h-10 justify-center rounded-md border border-border/50 bg-background/50"
				>
					{#if isDark}
						<span class="i-lucide-sun w-4 h-4"></span>
					{:else}
						<span class="i-lucide-moon w-4 h-4"></span>
					{/if}
				</SidebarMenuButton>

				<SidebarMenuButton
					onclick={toggleCorporate}
					class={cn(
						'h-10 justify-center rounded-md border transition-all',
						isCorporate
							? 'border-primary/50 bg-primary/10 text-primary'
							: 'border-border/50 bg-background/50 text-muted-foreground'
					)}
				>
					<span class="i-lucide-briefcase w-4 h-4"></span>
				</SidebarMenuButton>
			</div>

			<div class="h-px w-full bg-border/50"></div>

			<!-- User Profile -->
			<div class="flex items-center justify-between px-2 py-1">
				<div class="flex flex-col overflow-hidden">
					<span class="truncate font-bold text-xs">{user?.firstName || 'User'}</span>
					<span class="truncate text-[10px] text-muted-foreground">{user?.email}</span>
				</div>
				<a
					href="/auth/logout"
					aria-label="Logout"
					class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted/50"
				>
					<span class="i-lucide-log-out w-4 h-4 text-muted-foreground"></span>
				</a>
			</div>
		</div>
	</SidebarFooter>
</Sidebar>
