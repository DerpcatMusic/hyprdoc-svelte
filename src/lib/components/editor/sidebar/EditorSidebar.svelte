<script lang="ts">
  import {
    ArrowLeft,
    Book,
    Box,
    Braces,
    ChevronLeft,
    Settings2,
    Sparkles,
  } from "lucide-svelte";
  import { untrack } from "svelte";
  import { cubicInOut } from "svelte/easing";
  import { fade, fly } from "svelte/transition";
  import ThemeToggle from "$lib/components/theme-toggle.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "$lib/components/ui/tooltip";
  import { useDocument, useModeState } from "$lib/editor/core/editor-context";
  import { uiStore } from "$lib/stores/ui-store.svelte";
  import { cn } from "$lib/utils";
  import AiAssistantPanel from "./panels/AiAssistantPanel.svelte";

  // Panels (Lazy loaded via simple imports for now)
  import BlockPalette from "./panels/BlockPalette.svelte";
  import GlobalVariablesPanel from "./panels/GlobalVariablesPanel.svelte";
  import GlossaryPanel from "./panels/GlossaryPanel.svelte";
  import SettingsPanel from "./panels/SettingsPanel.svelte";
  import SidebarNavIcon from "./SidebarNavIcon.svelte";

  // --- Tabs & State ---
  type TabType =
    | "components"
    | "glossary"
    | "variables"
    | "settings"
    | "ai"
    | null;

  let activeTab = $state<TabType>("components");
  const isOpen = $derived(activeTab !== null);

  const doc = useDocument();
  const mode = useModeState();

  function toggleTab(tab: TabType) {
    if (activeTab === tab) {
      activeTab = null;
    } else {
      activeTab = tab;
    }
  }

  // Wrapper for active content to handle transitions
  const ActivePanel = $derived.by(() => {
    switch (activeTab) {
      case "components":
        return BlockPalette;
      case "ai":
        return AiAssistantPanel;
      case "glossary":
        return GlossaryPanel;
      case "variables":
        return GlobalVariablesPanel;
      case "settings":
        return SettingsPanel;
      default:
        return null;
    }
  });

  const tabTitle = $derived.by(() => {
    switch (activeTab) {
      case "components":
        return "Blocks";
      case "ai":
        return "AI Assistant";
      case "glossary":
        return "Glossary";
      case "variables":
        return "Variables";
      case "settings":
        return "Settings";
      default:
        return "";
    }
  });
</script>

{#if !mode.isConsumer}
  <aside
    class={cn(
		"z-20 flex min-h-0 flex-row overflow-hidden border-border bg-card transition-all duration-300 ease-in-out",
		uiStore.corporateMode.current
			? "h-full rounded-none border-0 border-r"
			: "m-4 h-[calc(100%-2rem)] rounded-2xl border shadow-xl bg-card",
		isOpen ? "w-[22rem]" : "w-20"
	)}
  >
    <!-- --- RAIL COLUMN --- -->
    <TooltipProvider delayDuration={0}>
      <div
        class="flex w-20 shrink-0 flex-col items-center justify-between border-border/50 border-r bg-card/50 py-6"
      >
        <!-- Top: Branding & Tools -->
        <div class="flex flex-col items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              {#snippet child({ props })}
                <a
                  href="/dashboard"
                  {...props}
                  class="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition-all hover:scale-105 hover:bg-muted hover:text-foreground"
                >
                  <ArrowLeft class="size-5" />
                </a>
              {/snippet}
            </TooltipTrigger>
            <TooltipContent side="right" class="ml-2">
              Back to Dashboard
            </TooltipContent>
          </Tooltip>

        <Separator class="w-8 bg-border" />

        <SidebarNavIcon
          icon={Sparkles}
          label="AI Assistant"
          variant="magic"
          isActive={activeTab === 'ai'}
          onclick={() => toggleTab('ai')}
        />
        <SidebarNavIcon
          icon={Box}
          label="Blocks"
          variant="creative"
          isActive={activeTab === 'components'}
          onclick={() => toggleTab('components')}
        />
        <SidebarNavIcon
          icon={Book}
          label="Glossary"
          variant="serious"
          isActive={activeTab === 'glossary'}
          onclick={() => toggleTab('glossary')}
        />
        <SidebarNavIcon
          icon={Braces}
          label="Variables"
          variant="scientific"
          isActive={activeTab === 'variables'}
          onclick={() => toggleTab('variables')}
        />
      </div>

      <!-- Bottom: Settings + User -->
      <div class="flex flex-col items-center gap-4">
        <!-- Corporate Mode Toggle -->
        <Button
          variant="ghost"
          size="icon"
          class={cn("relative h-10 w-10 rounded-xl transition-colors shrink-0 flex items-center justify-center", uiStore.corporateMode.current && "bg-primary/10 text-primary")}
          onclick={() => uiStore.toggleCorporateMode()}
          title={uiStore.corporateMode.current ? "Creative Mode" : "Corporate Mode"}
        >
          {#key uiStore.corporateMode.current}
            <div
              class="absolute inset-0 flex items-center justify-center"
              in:fly={{ y: 5, duration: 200 }}
              out:fly={{ y: -5, duration: 200 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-briefcase"
              >
                <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
          {/key}
        </Button>

        <!-- Theme Toggle -->
        <ThemeToggle />

        <SidebarNavIcon
          icon={Settings2}
          label="Settings"
          variant="neutral"
          isActive={activeTab === 'settings'}
          onclick={() => toggleTab('settings')}
        />

        <Separator class="w-8 bg-border" />

        <!-- User Avatar Slot -->
        <!-- <UserButton /> -->
      </div>
    </div>
</TooltipProvider>

    <!-- --- CONTENT DRAWER --- -->
    {#if isOpen}
      <div
        transition:fly={{ x: -20, duration: 200, opacity: 0 }}
        class="flex min-w-0 flex-1 flex-col bg-transparent"
      >
        <!-- Header -->
        <div
          class="flex h-14 shrink-0 items-center justify-between border-border/40 border-b px-4"
        >
          <h2 class="font-semibold text-sm capitalize">{tabTitle}</h2>
          <Button
            variant="ghost"
            size="icon"
            onclick={() => activeTab = null}
            class="h-8 w-8 text-muted-foreground"
          >
            <ChevronLeft class="size-4" />
          </Button>
        </div>

        <!-- Scrollable Content -->
        <div
          class="scrollbar-thin scrollbar-thumb-muted-foreground/20 flex-1 overflow-y-auto pb-20"
        >
          {#if ActivePanel}
            <!-- Key block forces destroy/remount on tab switch for cleanup -->
            {#key activeTab}
              <div
                in:fly={{ x: 10, duration: 200, delay: 50 }}
                out:fade={{ duration: 100 }}
              >
                <ActivePanel />
              </div>
            {/key}
          {/if}
        </div>
      </div>
    {/if}
  </aside>
{/if}
