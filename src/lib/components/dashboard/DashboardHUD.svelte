<script lang="ts">
  import { useEventListener } from "runed";
  import { fade, scale } from "svelte/transition";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { cn } from "$lib/utils";

  interface Props {
    stats: {
      total: number;
      pending: number;
      completed: number;
      draft: number;
    };
    searchQuery: string;
    statusFilter: string;
    userName?: string | null;
  }

  let {
    stats,
    searchQuery = $bindable(),
    statusFilter = $bindable(),
    userName,
  }: Props = $props();

  let inputRef = $state<HTMLInputElement | null>(null);
  let isFocused = $state(false);

  const isExpanded = $derived(isFocused || searchQuery.length > 0);

  const filters = $derived.by(() => [
    {
      id: "all",
      label: "All",
      count: stats.total,
      iconClass: "i-lucide-file-text",
    },
    {
      id: "draft",
      label: "Draft",
      count: stats.draft,
      iconClass: "i-lucide-file-edit",
    },
    {
      id: "pending_signatures",
      label: "Pending",
      count: stats.pending,
      iconClass: "i-lucide-clock",
    },
    {
      id: "completed",
      label: "Completed",
      count: stats.completed,
      iconClass: "i-lucide-check-circle",
    },
  ]);

  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // Use RUNED useEventListener for automatic cleanup
  useEventListener(() => window, "keydown", (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "k")) {
      e.preventDefault();
      inputRef?.focus();
    }
    if (e.key === "Escape") {
      inputRef?.blur();
      isFocused = false;
    }
  });

  // GSAP Search Expansion REMOVED - using Svelte-friendly approach or native CSS transitions

  function clearSearch() {
    searchQuery = "";
    inputRef?.focus();
  }
</script>

<div class="z-40 flex w-full justify-center px-4 pt-8">
  <div
    class={cn(
			"relative flex h-16 items-center overflow-hidden rounded-full border border-border bg-card p-1.5 shadow-sm transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
			isExpanded ? "w-full max-w-3xl" : "w-auto"
		)}
  >
    <!-- Welcome Section -->
    {#if !isExpanded}
      <div
        transition:fade={{ duration: 200 }}
        class="flex shrink-0 items-center border-r border-border/40 py-1 pl-5 pr-6"
      >
        <div class="flex flex-col whitespace-nowrap">
          <span
            class="font-bold text-[10px] text-muted-foreground uppercase leading-none tracking-widest"
          >
            {currentDate}
          </span>
          <span class="mt-1 font-bold text-base tracking-tight">
            Hi, {userName || "Creative"}
          </span>
        </div>
      </div>
    {/if}

    <!-- Filters -->
    {#if !isExpanded}
      <div
        transition:fade={{ duration: 200 }}
        class="flex shrink-0 items-center gap-1 px-3"
      >
        {#each filters as f}
          <Button
            variant="ghost"
            onclick={() => statusFilter = f.id}
            class={cn(
							"group relative flex h-12 items-center gap-2 rounded-full px-4 transition-all active:scale-95 hover:bg-transparent",
							statusFilter === f.id
								? "text-primary-foreground hover:text-primary-foreground"
								: "border-transparent text-muted-foreground hover:border-border/40 hover:bg-muted hover:text-foreground"
						)}
          >
            <span class={cn(f.iconClass, "relative z-10 w-4.5 h-4.5")}></span>
            <span class="relative z-10 font-bold text-sm tracking-tight"
              >{f.count}</span
            >
            {#if statusFilter === f.id}
              <div
                class="absolute inset-x-1 inset-y-1 z-0 rounded-full bg-primary border border-primary/50"
                in:scale={{ duration: 300, start: 0.9 }}
              ></div>
            {/if}
          </Button>
        {/each}
      </div>
    {/if}

    <!-- Search Container -->
    <div
      class={cn(
				"relative flex h-12 items-center overflow-hidden transition-all duration-500",
				isExpanded ? "flex-1 px-4" : "w-48 pl-2"
			)}
      style={!isExpanded ? "max-width: 12rem" : "max-width: 100%"}
    >
      <div class="pointer-events-none absolute left-6 flex items-center"><span
        class={cn(
						"i-lucide-search w-5 h-5 transition-colors duration-300",
						isExpanded ? "text-primary scale-110" : "text-muted-foreground/60"
					)}
      ></span></div>
      <Input
        bind:ref={inputRef}
        type="text"
        bind:value={searchQuery}
        onfocus={() => isFocused = true}
        onblur={() => isFocused = false}
        placeholder={isExpanded ? "Search for documents, templates, or recipients..." : "Search..."}
        class={cn(
					"selection:bg-primary selection:text-primary-foreground h-11 w-full border-none bg-transparent pr-4 pl-12 font-medium text-sm outline-none transition-all placeholder:text-muted-foreground/40 hover:bg-primary/5 focus:bg-primary/10",
					isExpanded && "text-base"
				)}
      />
      {#if searchQuery.length > 0}
        <button
          transition:scale={{ duration: 150 }}
          onclick={clearSearch}
          aria-label="Clear search"
          class="absolute right-6 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-all hover:text-foreground hover:scale-110"
        >
          <span class="i-lucide-x w-4 h-4"></span>
        </button>
      {/if}
    </div>
  </div>
</div>
