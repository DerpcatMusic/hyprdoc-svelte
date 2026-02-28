<script lang="ts">
  /**
   * GlossaryHoverController - Global Hover Card for Terms
   * ════════════════════════════════════════════════════════════════════════════
   * Detects hover on .glossary-term elements and shows a HoverCard.
   * Ported from Next.js to Svelte 5.
   */
  import { useEventListener } from "runed";
  import { useQuery } from "convex-svelte";
  import { BookOpen, Loader2 } from "lucide-svelte";
  import { api } from "@/convex/_generated/api";
  import * as HoverCard from "$lib/components/ui/hover-card";
  import { cn } from "$lib/utils";

  let hoveredTerm = $state<string | null>(null);
  let anchorRect = $state<DOMRect | null>(null);
  let isOpen = $state(false);

  // Fetch on demand - Convex caches this
  const termQuery = useQuery(
    api.glossary.queries.getTerm,
    () => (hoveredTerm ? { term: hoveredTerm } : "skip")
  );
  const termData = $derived(termQuery.data);
  const isLoading = $derived(termQuery.isLoading);

  // Use runed's useEventListener for global delegation
  useEventListener(
    () => document,
    "mouseover",
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("glossary-term")) {
        const term = target.getAttribute("data-glossary-term");
        if (term) {
          hoveredTerm = term;
          anchorRect = target.getBoundingClientRect();
          isOpen = true;
        }
      }
    }
  );

  // Close hover card when leaving glossary terms (with small delay for UX)
  let closeTimeout: ReturnType<typeof setTimeout> | null = null;
  
  useEventListener(
    () => document,
    "mouseout",
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      
      if (target.classList.contains("glossary-term")) {
        // If moving to another glossary term or the hover card content, don't close
        if (relatedTarget?.classList.contains("glossary-term") ||
            relatedTarget?.closest("[data-radix-hover-card-content]")) {
          return;
        }
        
        // Small delay before closing to allow moving to hover card
        closeTimeout = setTimeout(() => {
          isOpen = false;
        }, 150);
      }
    }
  );

  // Cancel close if entering hover card content
  useEventListener(
    () => document,
    "mouseover",
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-radix-hover-card-content]") && closeTimeout) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
      }
    }
  );

</script>

{#if isOpen && anchorRect}
  <HoverCard.Root open={isOpen} onOpenChange={(v: boolean) => (isOpen = v)} openDelay={200}>
    <!-- Virtual Trigger -->
    <HoverCard.Trigger class="fixed z-50 bg-transparent pointer-events-none border-none p-0 h-auto w-auto" style="top: {anchorRect.top}px; left: {anchorRect.left}px; width: {anchorRect.width}px; height: {anchorRect.height}px;">
      <div class="sr-only">Term Trigger</div>
    </HoverCard.Trigger>

    <HoverCard.Content class="w-80 p-0 overflow-hidden" align="start" sideOffset={5}>
      <div class="flex flex-col border-primary border-l-4 bg-card">
        <!-- Header -->
        <div class="border-b bg-muted/30 px-4 py-2.5">
          <div class="flex items-center justify-between">
            <h4 class="font-bold font-display text-sm">{hoveredTerm}</h4>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-[10px] text-primary uppercase tracking-wider">
              <BookOpen size={10} />
              {termData?.category || "Dictionary"}
            </span>
          </div>
        </div>

        <!-- Content -->
        <div class="p-4">
          {#if isLoading}
            <div class="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 class="size-3 animate-spin text-primary" />
              Loading definition...
            </div>
          {:else}
            {#if termData}
              <p class="font-medium text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {termData.definition}
              </p>
            {:else}
              <div class="text-muted-foreground text-xs italic">
                Definition not found for "{hoveredTerm}".
              </div>
            {/if}
          {/if}
        </div>

        <!-- Footer -->
        {#if termData?.source}
          <div class="bg-muted/10 px-4 py-2 border-t border-border/40">
            <p class="font-mono text-[9px] text-muted-foreground/60 uppercase">
              Source: {termData.source}
            </p>
          </div>
        {/if}
      </div>
    </HoverCard.Content>
  </HoverCard.Root>
{/if}
