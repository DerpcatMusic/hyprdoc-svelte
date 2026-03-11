<script lang="ts">
  import { formatDistanceToNowStrict } from "date-fns";
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn, type WithElementRef } from "$lib/utils";
  import {
    envelopeSignerStatusLabel,
    envelopeSignerStatusTone,
    envelopeToneDotClasses,
    envelopeToneSurfaceClasses,
  } from "./styles";
  import type { EnvelopeSignerStep } from "./types";

  interface Props extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
    title?: string;
    description?: string;
    steps?: EnvelopeSignerStep[];
    emptyLabel?: string;
    footer?: Snippet;
    children?: Snippet;
  }

  let {
    ref = $bindable(null),
    class: className,
    title = "Signer timeline",
    description,
    steps = [],
    emptyLabel = "No signer activity yet.",
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

  {#if steps.length === 0}
    <div
      class="mt-4 rounded-[1.25rem] border border-dashed border-border/70 bg-background/50 px-4 py-6 text-muted-foreground text-sm"
    >
      {emptyLabel}
    </div>
  {:else}
    <ol class="mt-4 space-y-4">
      {#each steps as step, index (step.id)}
        {@const status = step.status ?? "pending"}
        {@const tone = envelopeSignerStatusTone[status]}
        <li class="relative pl-10">
          {#if index < steps.length - 1}
            <span
              class="absolute top-8 left-[0.95rem] h-[calc(100%-0.25rem)] w-px bg-border/80"
            ></span>
          {/if}

          <span
            class={cn(
              "absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
              envelopeToneSurfaceClasses[tone]
            )}
          >
            {#if status === "completed"}
              ✓
            {:else}
              {index + 1}
            {/if}
          </span>

          <div class="rounded-[1.25rem] border border-border/60 bg-background/60 px-4 py-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold text-sm text-foreground">{step.name}</p>
                  <span
                    class={cn(
                      "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-semibold text-[10px] uppercase tracking-[0.18em]",
                      envelopeToneSurfaceClasses[tone]
                    )}
                  >
                    <span
                      class={cn("h-1.5 w-1.5 rounded-full", envelopeToneDotClasses[tone])}
                    ></span>
                    {envelopeSignerStatusLabel[status]}
                  </span>
                </div>

                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
                  {#if step.role}
                    <span>{step.role}</span>
                  {/if}
                  {#if step.email}
                    <span class="font-mono text-[11px]">{step.email}</span>
                  {/if}
                </div>
              </div>

              {#if formatTimestamp(step.timestamp)}
                <p class="shrink-0 text-muted-foreground text-xs">
                  {formatTimestamp(step.timestamp)}
                </p>
              {/if}
            </div>

            {#if step.detail}
              <p class="mt-3 text-sm text-foreground/90 leading-6">
                {step.detail}
              </p>
            {/if}

            {#if step.note}
              <p class="mt-2 text-muted-foreground text-xs leading-5">
                {step.note}
              </p>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
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
