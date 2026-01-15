<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { Badge } from "$lib/components/ui/badge";

  let { node, selected, editor, getPos }: any = $props();

  const name = $derived(node.attrs.name || "Unknown");
  const value = $derived(node.attrs.value || "--");
  const type = $derived(node.attrs.type || "text");

  function handleClick() {
    if (typeof getPos === 'function') {
      editor.commands.setNodeSelection(getPos());
    }
  }
</script>

<span 
  class="inline-block align-middle mx-0.5 cursor-pointer transition-all active:scale-95"
  class:ring-2={selected}
  class:ring-primary={selected}
  onclick={handleClick}
  role="button"
  tabindex="0"
  onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleClick()}
>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Badge 
        variant="secondary" 
        class="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 px-1.5 py-0 h-5 text-[10px] font-mono group"
      >
        <span class="opacity-70 mr-0.5">{"{"}</span>
        {name}
        <span class="opacity-70 ml-0.5">{"}"}</span>
      </Badge>
    </Tooltip.Trigger>
    <Tooltip.Content side="top" class="px-3 py-1.5 bg-background border border-border shadow-xl rounded-lg">
      <div class="flex flex-col gap-1 items-start">
        <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Global Variable</span>
        <span class="text-xs font-bold text-foreground">{name}</span>
        <div class="h-px w-full bg-border my-0.5"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] text-muted-foreground italic">Value:</span>
          <span class="text-xs font-mono bg-muted/50 px-1 rounded">{value}</span>
        </div>
      </div>
    </Tooltip.Content>
  </Tooltip.Root>
</span>

<style>
  /* Ensure the badge looks like a single immutable unit */
  :global(.global-variable) {
    display: inline;
    white-space: nowrap;
    user-select: none;
  }
</style>
