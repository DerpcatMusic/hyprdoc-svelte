<script lang="ts">
  import { Search } from "lucide-svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { useEditor } from "$lib/editor/core/editor-context";
  import { cn } from "$lib/utils";

  const engine = useEditor();

  let searchQuery = $state("");

  interface BlockDefinition {
    type: string;
    label: string;
    description?: string;
    icon?: string;
  }

  const NATIVE_BLOCKS: BlockDefinition[] = [];

  const filteredBlocks = $derived(
    NATIVE_BLOCKS.filter(b => 
      b.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  function insertBlock(def: BlockDefinition) {
    // Legacy Smart Block insertion removed.
  }

</script>

<div class="flex h-full w-full flex-col bg-transparent">
  <div class="sticky top-0 z-10 border-b border-border/20 bg-card/80 px-3 py-3 backdrop-blur-md">
    <div class="group relative w-full">
      <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 transition-colors group-hover:text-primary/70" />
      <input
        placeholder="Search blocks..."
        bind:value={searchQuery}
        class="flex h-8 w-full rounded-lg border border-border/10 bg-muted/40 pl-8 text-[11px] transition-all focus-visible:border-primary/20 focus-visible:bg-muted/60 focus-visible:outline-none"
      />
    </div>
  </div>

  <ScrollArea class="flex-1">
    <div class="space-y-6 px-2 py-4">
      {#if filteredBlocks.length === 0}
        <div class="text-center text-sm text-muted-foreground py-8">
          No blocks found
        </div>
      {/if}

      <div class="grid grid-cols-1 gap-2.5">
        {#each filteredBlocks as block}
          <button
            type="button"
            onclick={() => insertBlock(block)}
            class="group relative flex flex-col gap-2 rounded-xl border border-border/20 bg-card/40 p-3 text-left transition-all hover:border-primary/20 hover:bg-card hover:shadow-md"
          >
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg border bg-muted/50 group-hover:bg-primary/5 transition-colors">
                <span class={cn(block.icon, "size-4 text-muted-foreground group-hover:text-primary transition-colors")}></span>
              </div>
              <div class="flex flex-col">
                <span class="font-medium text-xs text-foreground/90 group-hover:text-foreground">{block.label}</span>
                <span class="text-[10px] text-muted-foreground/70">{block.description}</span>
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>
  </ScrollArea>
</div>
