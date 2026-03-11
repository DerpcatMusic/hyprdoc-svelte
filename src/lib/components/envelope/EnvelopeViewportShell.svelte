<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { cn, type WithElementRef } from "$lib/utils";
  import { envelopeToneDotClasses, envelopeToneTextClasses } from "./styles";
  import type { EnvelopeMetaItem, EnvelopeTone } from "./types";

  interface Props extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
    title: string;
    eyebrow?: string;
    subtitle?: string;
    statusLabel?: string;
    statusTone?: EnvelopeTone;
    meta?: EnvelopeMetaItem[];
    viewportClass?: string;
    sidebarClass?: string;
    toolbar?: Snippet;
    aside?: Snippet;
    footer?: Snippet;
    children?: Snippet;
  }

  let {
    ref = $bindable(null),
    class: className,
    title,
    eyebrow = "Sealed envelope",
    subtitle,
    statusLabel,
    statusTone = "neutral",
    meta = [],
    viewportClass,
    sidebarClass,
    toolbar,
    aside,
    footer,
    children,
    ...restProps
  }: Props = $props();
</script>

<div
  bind:this={ref}
  class={cn("grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]", className)}
  {...restProps}
>
  <section
    class="flex min-h-[32rem] min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/95 shadow-sm backdrop-blur-sm"
  >
    <header class="border-b border-border/70 px-5 py-4 md:px-6">
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div class="min-w-0 space-y-1">
          <p
            class="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.24em]"
          >
            {eyebrow}
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="truncate font-display text-2xl text-foreground md:text-3xl">
              {title}
            </h2>
            {#if statusLabel}
              <span
                class="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 font-semibold text-[11px] uppercase tracking-[0.18em]"
              >
                <span
                  class={cn(
                    "h-2 w-2 rounded-full",
                    envelopeToneDotClasses[statusTone]
                  )}
                ></span>
                <span class={cn(envelopeToneTextClasses[statusTone])}>
                  {statusLabel}
                </span>
              </span>
            {/if}
          </div>
          {#if subtitle}
            <p class="max-w-3xl text-muted-foreground text-sm leading-6">
              {subtitle}
            </p>
          {/if}
        </div>

        {#if toolbar}
          <div class="flex shrink-0 flex-wrap items-center gap-2">
            {@render toolbar()}
          </div>
        {/if}
      </div>

      {#if meta.length > 0}
        <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {#each meta as item (`${item.label}-${item.value}`)}
            <div class="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
              <p
                class="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.2em]"
              >
                {item.label}
              </p>
              <p
                class={cn(
                  "mt-1 truncate font-semibold text-sm text-foreground",
                  item.mono && "font-mono text-[13px]",
                  item.tone && envelopeToneTextClasses[item.tone]
                )}
              >
                {item.value}
              </p>
              {#if item.hint}
                <p class="mt-1 truncate text-muted-foreground text-xs">
                  {item.hint}
                </p>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </header>

    <div class="flex min-h-0 flex-1 flex-col bg-background/35">
      <ScrollArea class={cn("min-h-0 flex-1", viewportClass)}>
        <div class="min-h-full bg-document/90 p-4 md:p-6">
          {@render children?.()}
        </div>
      </ScrollArea>
    </div>

    {#if footer}
      <div class="border-t border-border/70 px-5 py-4 md:px-6">
        {@render footer()}
      </div>
    {/if}
  </section>

  {#if aside}
    <aside class={cn("flex min-h-0 flex-col gap-4", sidebarClass)}>
      {@render aside()}
    </aside>
  {/if}
</div>
