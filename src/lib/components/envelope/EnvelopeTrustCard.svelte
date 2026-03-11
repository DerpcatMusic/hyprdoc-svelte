<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn, type WithElementRef } from "$lib/utils";
  import {
    envelopeToneDotClasses,
    envelopeToneSurfaceClasses,
    envelopeToneTextClasses,
  } from "./styles";
  import type { EnvelopeTone, EnvelopeTrustMetric } from "./types";

  interface Props extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
    title: string;
    description?: string;
    value?: string;
    valueLabel?: string;
    statusLabel?: string;
    statusTone?: EnvelopeTone;
    metrics?: EnvelopeTrustMetric[];
    footer?: Snippet;
    children?: Snippet;
  }

  let {
    ref = $bindable(null),
    class: className,
    title,
    description,
    value,
    valueLabel,
    statusLabel,
    statusTone = "success",
    metrics = [],
    footer,
    children,
    ...restProps
  }: Props = $props();
</script>

<section
  bind:this={ref}
  class={cn(
    "rounded-[1.5rem] border border-border/70 bg-card px-5 py-5 shadow-sm",
    className
  )}
  {...restProps}
>
  <div class="flex items-start justify-between gap-4">
    <div class="space-y-1">
      <p class="font-semibold text-base text-foreground">{title}</p>
      {#if description}
        <p class="text-muted-foreground text-sm leading-6">{description}</p>
      {/if}
    </div>

    {#if statusLabel}
      <span
        class={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 font-semibold text-[11px] uppercase tracking-[0.18em]",
          envelopeToneSurfaceClasses[statusTone]
        )}
      >
        <span
          class={cn("h-2 w-2 rounded-full", envelopeToneDotClasses[statusTone])}
        ></span>
        {statusLabel}
      </span>
    {/if}
  </div>

  {#if value}
    <div class="mt-5 rounded-[1.25rem] border border-border/60 bg-background/80 px-4 py-4">
      <p class="font-display text-3xl leading-none text-foreground md:text-4xl">
        {value}
      </p>
      {#if valueLabel}
        <p class="mt-2 text-muted-foreground text-xs uppercase tracking-[0.2em]">
          {valueLabel}
        </p>
      {/if}
    </div>
  {/if}

  {#if metrics.length > 0}
    <div class="mt-4 grid gap-3">
      {#each metrics as metric (`${metric.label}-${metric.value}`)}
        <div
          class="grid gap-2 rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p
                class="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.18em]"
              >
                {metric.label}
              </p>
              {#if metric.detail}
                <p class="mt-1 text-muted-foreground text-xs leading-5">
                  {metric.detail}
                </p>
              {/if}
            </div>
            <p
              class={cn(
                "text-right font-semibold text-sm text-foreground",
                metric.mono && "font-mono text-[13px]",
                metric.tone && envelopeToneTextClasses[metric.tone]
              )}
            >
              {metric.value}
            </p>
          </div>
        </div>
      {/each}
    </div>
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
