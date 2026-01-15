<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import { onMount } from "svelte";
  import type { CommandItem } from "./SlashMenuState.svelte";

  interface Props {
    items: CommandItem[];
    command: (item: CommandItem) => void;
    editor: Editor;
    onKeyDown: (handler: (event: KeyboardEvent) => boolean) => void;
  }

  let { items = [], command, editor, onKeyDown }: Props = $props();

  let selectedIndex = $state(0);
  let scrollContainer = $state<HTMLElement>();

  // Reset selection when items change
  $effect(() => {
    items;
    selectedIndex = 0;
  });

  // Scroll active item into view
  $effect(() => {
    if (scrollContainer && items.length > 0) {
      const children = scrollContainer.querySelectorAll("[data-command-item]");
      const activeItem = children[selectedIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  });

  function selectItem(index: number) {
    const item = items[index];
    if (item) {
      command(item);
    }
  }

  function handleKeyDown(event: KeyboardEvent): boolean {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = (selectedIndex + items.length - 1) % items.length;
      return true;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      return true;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      selectItem(selectedIndex);
      return true;
    }
    return false;
  }

  // Register key handler with the parent renderer
  onMount(() => {
    onKeyDown(handleKeyDown);
  });
</script>

{#if items.length > 0}
  <div
    bind:this={scrollContainer}
    class="z-50 max-h-[300px] min-w-[300px] overflow-hidden overflow-y-auto scroll-smooth rounded-lg border border-border bg-popover text-popover-foreground shadow-xl"
  >
    <div
      class="sticky top-0 z-10 border-b border-border bg-muted px-3 py-2 font-semibold text-muted-foreground text-xs"
    >
      BLOCKS
    </div>
    {#each items as item, index (item.type + '-' + item.title)}
      <button
        type="button"
        data-command-item
        class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors {index ===
				selectedIndex
					? 'bg-primary/10 text-primary'
					: 'text-popover-foreground hover:bg-muted'}"
        onclick={() => selectItem(index)}
        onmouseenter={() => (selectedIndex = index)}
      >
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded border {index ===
					selectedIndex
						? 'border-primary/30 bg-background text-primary'
						: 'border-border bg-muted text-muted-foreground'}"
        >
          {#if item.icon}
            <span class={item.icon}></span>
          {:else}
            <span class="i-lucide-box size-4"></span>
          {/if}
        </div>
        <div class="flex flex-col gap-0.5 overflow-hidden">
          <span class="font-medium truncate">{item.title}</span>
          <span class="text-xs text-muted-foreground truncate opacity-80"
            >{item.description}</span
          >
        </div>
      </button>
    {/each}
  </div>
{/if}
