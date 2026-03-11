<script lang="ts">
  import { formatDistanceToNowStrict } from "date-fns";
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { cn, type WithElementRef } from "$lib/utils";
  import {
    envelopeToneDotClasses,
    envelopeToneSurfaceClasses,
  } from "./styles";
  import type { EnvelopeAuditEvent } from "./types";

  interface Props extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
    title?: string;
    description?: string;
    events?: EnvelopeAuditEvent[];
    emptyLabel?: string;
    maxHeight?: string;
    footer?: Snippet;
    children?: Snippet;
  }

  let {
    ref = $bindable(null),
    class: className,
    title = "Audit feed",
    description,
    events = [],
    emptyLabel = "No audit entries yet.",
    maxHeight = "24rem",
    footer,
    children,
    ...restProps
  }: Props = $props();

  function formatTimestamp(timestamp?: number) {
    if (!timestamp) {
      return null;
    }

    return formatDistanceToNowStrict(timestamp, { addSuffix: true });
  }
</script>

<section
  bind:this={ref}
  class={cn(
    "rounded-[1.5rem] border border-border/70 bg-card px-5 py-5 shadow-sm",
    className
  )}
  {...restProps}
>
  <div class="space-y-1">
    <p class="font-semibold text-base text-foreground">{title}</p>
    {#if description}
      <p class="text-muted-foreground text-sm leading-6">{description}</p>
    {/if}
  </div>

  {#if events.length === 0}
    <div
      class="mt-4 rounded-[1.25rem] border border-dashed border-border/70 bg-background/50 px-4 py-6 text-muted-foreground text-sm"
    >
      {emptyLabel}
    </div>
  {:else}
    <ScrollArea class="mt-4" style={`max-height: ${maxHeight};`}>
      <div class="space-y-3 pr-4">
        {#each events as event (event.id)}
          {@const tone = event.tone ?? "neutral"}
          <article
            class="rounded-[1.25rem] border border-border/60 bg-background/60 px-4 py-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full", envelopeToneDotClasses[tone])}
                  ></span>
                  <p class="font-semibold text-sm text-foreground">
                    {event.actor}
                  </p>
                  <span class="text-muted-foreground text-xs">·</span>
                  <p class="text-sm text-foreground/90">{event.action}</p>
                </div>

                {#if event.detail}
                  <p class="mt-2 text-muted-foreground text-sm leading-6">
                    {event.detail}
                  </p>
                {/if}
              </div>

              {#if formatTimestamp(event.timestamp)}
                <p class="shrink-0 text-muted-foreground text-xs">
                  {formatTimestamp(event.timestamp)}
                </p>
              {/if}
            </div>

            {#if event.hash}
              <div
                class={cn(
                  "mt-3 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px]",
                  envelopeToneSurfaceClasses[tone]
                )}
              >
                <span class="font-sans font-semibold uppercase tracking-[0.18em]">
                  Hash
                </span>
                <span class="truncate">{event.hash}</span>
              </div>
            {/if}

            {#if event.metadata && event.metadata.length > 0}
              <div class="mt-3 flex flex-wrap gap-2">
                {#each event.metadata as item (`${event.id}-${item.label}-${item.value}`)}
                  <div
                    class="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1"
                  >
                    <span
                      class="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.16em]"
                    >
                      {item.label}
                    </span>
                    <span
                      class={cn(
                        "max-w-[14rem] truncate text-xs text-foreground",
                        item.mono && "font-mono text-[11px]"
                      )}
                    >
                      {item.value}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </article>
        {/each}
      </div>
    </ScrollArea>
  {/if}

  {#if children}
    <div class="mt-4">
      {@render children()}
    </div>
  {/if}

  {#if footer}
    <div class="mt-4 border-t border-border/60 pt-4">
      {@render footer()}
    </div>
  {/if}
</section>
