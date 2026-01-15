<script lang="ts">
  import { Combobox } from "bits-ui";
  import { Check, ChevronsUpDown } from "lucide-svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { cn } from "$lib/utils";
  import { GOOGLE_FONTS, loadGoogleFont } from "$lib/utils/fonts";

  // Props using Svelte 5 runes
  let { value = $bindable(""), onValueChange } = $props<{
    value: string;
    onValueChange?: (value: string) => void;
  }>();

  let searchValue = $state("");
  let touchedInput = $state(false);

  const filteredFonts = $derived(
    searchValue === ""
      ? GOOGLE_FONTS
      : GOOGLE_FONTS.filter((font) =>
          font.label.toLowerCase().includes(searchValue.toLowerCase())
        )
  );

  function handleSelect(newValue: string) {
    value = newValue;
    loadGoogleFont(newValue);
    if (onValueChange) onValueChange(newValue);
  }

  // Load initial font
  $effect(() => {
    if (value) {
      loadGoogleFont(value);
    }
  });
  let open = $state(false);
</script>

<Combobox.Root type="single" bind:value bind:open onValueChange={handleSelect}>
  <div 
    class="relative w-full" 
    role="combobox"
    aria-expanded={open}
    aria-haspopup="listbox"
    aria-controls="font-results" 
    tabindex="0"
    onclick={() => open = true}
    onkeydown={(e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open = true;
      }
    }}
  >
    <Combobox.Input
      class={cn(
				"flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
			)}
      placeholder="Select font..."
      oninput={(e: any) => {
				searchValue = e.currentTarget.value;
				touchedInput = true;
				open = true;
			}}
      onfocus={() => open = true}
    />
    <div
      class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none"
    >
      <ChevronsUpDown class="h-4 w-4 opacity-50" />
    </div>
  </div>

  <Combobox.Content
    class="w-full min-w-[var(--bits-combobox-anchor-width)] p-1 z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-80"
    sideOffset={4}
  >
    <ScrollArea class="h-60">
      {#each filteredFonts as font (font.value)}
        <Combobox.Item
          value={font.value}
          label={font.label}
          class={cn(
						"relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
					)}
        >
          <span style:font-family={font.value} class="flex-1 truncate">
            {font.label}
          </span>
          {#if value === font.value}
            <span
              class="absolute right-2 flex h-3.5 w-3.5 items-center justify-center"
            >
              <Check class="h-4 w-4" />
            </span>
          {/if}
        </Combobox.Item>
      {:else}
        <div class="px-2 py-4 text-center text-sm text-muted-foreground">
          No font found.
        </div>
      {/each}
    </ScrollArea>
  </Combobox.Content>
</Combobox.Root>
