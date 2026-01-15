<script lang="ts">
  import { Check, ChevronsUpDown, Search } from "lucide-svelte";
  import { Combobox } from "bits-ui";
  import { cn } from "$lib/utils";
  import { FONT_OPTIONS } from "$lib/constants/fonts";
  import { fade, fly } from "svelte/transition";

  interface Props {
    value? : string;
    onValueChange?: (value: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
  }

  let { 
    value = $bindable(),
    onValueChange,
    label,
    placeholder = "Select font...",
    className
  }: Props = $props();

  let open = $state(false);
  let searchValue = $state("");

  const selectedLabel = $derived(
    FONT_OPTIONS.find((f) => f.value.toLowerCase() === value?.toLowerCase())?.label ?? ""
  );

  const filteredFonts = $derived(
    searchValue === "" 
      ? FONT_OPTIONS
      : FONT_OPTIONS.filter(f => 
          f.label.toLowerCase().includes(searchValue.toLowerCase())
        )
  );

  const inputValue = $derived.by(() => {
    if (open) return searchValue;
    return selectedLabel;
  });

  function handleSelect(fontValue: string) {
    value = fontValue;
    onValueChange?.(fontValue);
    searchValue = "";
    open = false;
  }
</script>

<div class={cn("flex flex-col gap-1.5", className)}>
  {#if label}
    <span class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 select-none">{label}</span>
  {/if}

  <Combobox.Root
    type="single"
    {inputValue}
    bind:value
    bind:open
    items={FONT_OPTIONS}
    onValueChange={(v) => v && handleSelect(v)}
  >
    <div class="relative group">
      <Combobox.Input
        class="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-8"
        {placeholder}
        oninput={(e) => {
          searchValue = e.currentTarget.value;
          open = true;
        }}
        onclick={() => open = true}
        onfocus={() => open = true}
      />
      <Combobox.Trigger class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
        <ChevronsUpDown class="size-4" />
      </Combobox.Trigger>
    </div>

    <Combobox.Portal>
      <Combobox.Content
        class="z-[100] w-[var(--bits-combobox-anchor-width)] min-w-[160px] rounded-xl border border-border/60 bg-card p-1 shadow-2xl outline-none"
        sideOffset={8}
        transition={fly}
        transitionConfig={{ y: 5, duration: 200 }}
      >
        <div class="flex items-center px-3 py-2 border-b border-border/40 mb-1">
            <Search class="size-3.5 mr-2 text-muted-foreground/50" />
            <input 
                bind:value={searchValue} 
                placeholder="Type to filter..." 
                class="bg-transparent text-xs outline-none flex-1"
                onkeydown={(e) => e.stopPropagation()}
            />
        </div>
        
        <Combobox.Viewport class="max-h-[300px] overflow-y-auto scrollbar-none p-1">
          {#if filteredFonts.length === 0}
            <div class="px-2 py-4 text-center text-xs text-muted-foreground italic">
              No fonts match your search
            </div>
          {:else}
            {#each filteredFonts as font (font.value)}
              <Combobox.Item
                value={font.value}
                label={font.label}
                class="flex items-center justify-between rounded-lg px-3 py-2 text-sm outline-none cursor-pointer data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary transition-colors duration-150"
              >
                <div class="flex flex-col gap-0.5 min-w-0">
                    <span class="font-medium truncate">{font.label}</span>
                    <span class="text-[10px] text-muted-foreground/70 truncate opacity-0 group-data-[highlighted]:opacity-100 transition-opacity" style="font-family: '{font.value}', sans-serif">
                        The quick brown fox jumps over the lazy dog
                    </span>
                </div>
                {#if value === font.value}
                    <Check class="size-4 text-primary shrink-0" />
                {/if}
              </Combobox.Item>
            {/each}
          {/if}
        </Combobox.Viewport>
      </Combobox.Content>
    </Combobox.Portal>
  </Combobox.Root>
</div>

<style>
    /* Hide scrollbar but keep functionality */
    :global(.scrollbar-none::-webkit-scrollbar) {
        display: none;
    }
    :global(.scrollbar-none) {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
