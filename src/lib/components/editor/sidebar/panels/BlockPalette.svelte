<script lang="ts">
  /**
   * BlockPalette - Sidebar panel for inserting HyprDoc blocks
   * 
   * Uses the BlockRegistry singleton to dynamically load and display available blocks.
   */
  import { Search } from "lucide-svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { blockRegistry } from "$lib/blocks/registry";
  import type { BlockDefinition, BlockCategory } from "$lib/blocks/types";
  import { useEditorBrain } from "$lib/editor/core/EditorBrain.svelte";
  import { cn } from "$lib/utils";

  const brain = useEditorBrain();

  let searchQuery = $state("");

  $effect(() => {
    void blockRegistry.ready();
  });

  // Filter blocks based on search
  const filteredBlocks = $derived(() => {
    if (blockRegistry.loading) return [];

    const query = searchQuery.toLowerCase();
    if (!query) return blockRegistry.all;
    return blockRegistry.all.filter(
      (b: BlockDefinition) =>
        b.name.toLowerCase().includes(query) ||
        b.type.toLowerCase().includes(query) ||
        b.description.toLowerCase().includes(query)
    );
  });

  // Group blocks by category
  const groupedBlocks = $derived(() => {
    const groups: Record<string, BlockDefinition[]> = {};
    for (const block of filteredBlocks()) {
      const catId = block.categoryId;
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(block);
    }
    return Object.entries(groups).sort(
      ([left], [right]) => getCategoryOrder(left) - getCategoryOrder(right)
    );
  });

  // Get category info
  function getCategoryOrder(categoryId: string): number {
    const cat = blockRegistry.categories.find((c: BlockCategory) => c.id === categoryId);
    return cat?.order ?? Number.MAX_SAFE_INTEGER;
  }

  function getCategoryName(categoryId: string): string {
    const cat = blockRegistry.categories.find((c: BlockCategory) => c.id === categoryId);
    return cat?.name ?? categoryId;
  }

  function getCategoryIcon(categoryId: string): string {
    const cat = blockRegistry.categories.find((c: BlockCategory) => c.id === categoryId);
    return cat?.icon ?? "i-lucide-box";
  }

  // Insert block into editor
  function insertBlock(blockType: string): void {
    const def = blockRegistry.get(blockType);
    if (!def || !brain.editor) return;

    brain.editor.chain().focus().insertHyprDocBlock({
      blockType: def.type,
      data: def.defaults as Record<string, unknown>,
      required: false,
    }).run();
  }
</script>

<div class="flex h-full w-full flex-col bg-card">
  <!-- Search Input -->
  <div class="sticky top-0 z-10 border-b border-border bg-card px-3 py-3">
    <div class="group relative w-full">
      <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 transition-colors group-hover:text-primary/70" />
      <input
        placeholder="Search blocks..."
        bind:value={searchQuery}
        class="flex h-8 w-full rounded-lg border border-border bg-muted pl-8 text-[11px] transition-all focus-visible:border-primary/40 focus-visible:bg-muted/80 focus-visible:outline-none"
      />
    </div>
  </div>

  <ScrollArea class="flex-1">
    <div class="space-y-4 px-2 py-4">
      <!-- Loading State -->
      {#if blockRegistry.loading}
        <div class="flex items-center justify-center py-8">
          <span class="i-lucide-loader-2 animate-spin size-5 text-muted-foreground"></span>
        </div>
      <!-- Error State -->
      {:else if blockRegistry.error}
        <div class="text-center text-sm text-destructive py-8">
          {blockRegistry.error}
        </div>
      <!-- Empty State -->
      {:else if filteredBlocks().length === 0}
        <div class="text-center text-sm text-muted-foreground py-8">
          No blocks found
        </div>
      <!-- Block Categories -->
      {:else}
        {#each groupedBlocks() as [categoryId, blocks]}
          <div class="space-y-2">
            <!-- Category Header -->
            <div class="flex items-center gap-2 px-1">
              <span class={cn(getCategoryIcon(categoryId), "size-3.5 text-muted-foreground")}></span>
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {getCategoryName(categoryId)}
              </span>
            </div>
            
            <!-- Block Grid -->
            <div class="grid grid-cols-1 gap-1.5">
              {#each blocks as block}
                <button
                  type="button"
                  onclick={() => insertBlock(block.type)}
                  class="group relative flex items-center gap-3 rounded-lg border border-transparent bg-secondary/20 px-3 py-2.5 text-left transition-all hover:border-primary/40 hover:bg-secondary/40"
                >
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted group-hover:bg-primary/10 transition-colors">
                    <span class={cn(block.icon, "size-4 text-muted-foreground group-hover:text-primary transition-colors")}></span>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="font-medium text-xs text-foreground/90 group-hover:text-foreground truncate">
                      {block.name}
                    </span>
                    <span class="text-[10px] text-muted-foreground/70 truncate">
                      {block.description}
                    </span>
                  </div>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </ScrollArea>
</div>
