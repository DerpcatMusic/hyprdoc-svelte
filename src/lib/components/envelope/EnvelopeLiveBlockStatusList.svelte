<script lang="ts">
  import { formatDistanceToNowStrict } from "date-fns";
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn, type WithElementRef } from "$lib/utils";
  import {
    envelopeBlockStateLabel,
    envelopeBlockStateTone,
    envelopeToneDotClasses,
    envelopeToneSurfaceClasses,
  } from "./styles";
  import type { EnvelopeBlockStatus } from "./types";

  interface Props extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
    blocks?: EnvelopeBlockStatus[];
    children?: Snippet;
    defaultStaleAfterMs?: number;
    description?: string;
    emptyLabel?: string;
    footer?: Snippet;
    now?: number;
    onSelect?: ((block: EnvelopeBlockStatus) => void) | undefined;
    selectedId?: string | null;
    title?: string;
  }

  let {
    ref = $bindable(null),
    class: className,
    title = "Live block status",
    description,
    blocks = [],
    now,
    defaultStaleAfterMs = 30_000,
    emptyLabel = "No live block telemetry yet.",
    selectedId = null,
    onSelect,
    footer,
    children,
    ...restProps
  }: Props = $props();

  const renderNow = $derived(now ?? Date.now());

  function isStale(block: EnvelopeBlockStatus) {
    if (!block.updatedAt) {
      return false;
    }

    return (
      renderNow - block.updatedAt > (block.staleAfterMs ?? defaultStaleAfterMs)
    );
  }

  function shouldPulse(block: EnvelopeBlockStatus) {
    return Boolean(block.pulse) && !isStale(block);
  }

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

  {#if blocks.length === 0}
    <div
      class="mt-4 rounded-[1.25rem] border border-dashed border-border/70 bg-background/50 px-4 py-6 text-muted-foreground text-sm"
    >
      {emptyLabel}
    </div>
  {:else}
    <div class="mt-4 space-y-3">
      {#each blocks as block (block.id)}
        {@const stale = isStale(block)}
        {@const tone = stale ? "warning" : envelopeBlockStateTone[block.state]}
        {@const selected = selectedId === block.id}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <article
          class={cn(
            "rounded-[1.25rem] border border-border/60 bg-background/60 px-4 py-4 transition-all",
            onSelect && "cursor-pointer hover:border-primary/20 hover:bg-background/80",
            selected && "border-primary/30 bg-primary/[0.045] shadow-[0_0_0_1px_rgba(59,130,246,0.12)]"
          )}
          role={onSelect ? "button" : undefined}
          tabindex={onSelect ? 0 : undefined}
          onclick={() => onSelect?.(block)}
          onkeydown={(event: KeyboardEvent) => {
            if (!onSelect) {
              return;
            }
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(block);
            }
          }}
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="relative flex h-2.5 w-2.5 shrink-0">
                  <span
                    class={cn(
                      "absolute inset-0 rounded-full",
                      envelopeToneDotClasses[tone]
                    )}
                  ></span>
                  {#if shouldPulse(block)}
                    <span
                      class={cn(
                        "absolute inset-0 animate-ping rounded-full opacity-70",
                        envelopeToneDotClasses[tone]
                      )}
                    ></span>
                  {/if}
                </span>

                <p class="font-semibold text-sm text-foreground">
                  {block.label}
                </p>

                <span
                  class={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 font-semibold text-[10px] uppercase tracking-[0.18em]",
                    envelopeToneSurfaceClasses[tone]
                  )}
                >
                  {stale ? "Stale" : envelopeBlockStateLabel[block.state]}
                </span>

                {#if block.blockType}
                  <span
                    class="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[10px] text-muted-foreground uppercase tracking-[0.18em]"
                  >
                    {block.blockType}
                  </span>
                {/if}
              </div>

              {#if block.detail}
                <p class="mt-2 text-muted-foreground text-sm leading-6">
                  {block.detail}
                </p>
              {/if}

              <div class="mt-3 flex flex-wrap gap-2">
                {#if block.slot}
                  <span
                    class="rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground"
                  >
                    Slot {block.slot}
                  </span>
                {/if}

                {#if block.evidence}
                  <span
                    class="rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground"
                  >
                    {block.evidence}
                  </span>
                {/if}

                {#if block.hash}
                  <span
                    class="max-w-full truncate rounded-full border border-border/70 bg-card px-3 py-1 font-mono text-[11px] text-foreground"
                  >
                    {block.hash}
                  </span>
                {/if}
              </div>
            </div>

            {#if formatTimestamp(block.updatedAt)}
              <p class="shrink-0 text-muted-foreground text-xs">
                {formatTimestamp(block.updatedAt)}
              </p>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}

  {#if children}
    <div class="mt-4">{@render children()}</div>
  {/if}

  {#if footer}
    <div class="mt-4 border-t border-border/60 pt-4">{@render footer()}</div>
  {/if}
</section>
