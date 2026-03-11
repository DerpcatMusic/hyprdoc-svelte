<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn, type WithElementRef } from "$lib/utils";
  import { envelopeToneTextClasses } from "./styles";
  import type { EnvelopeEvidenceItem } from "./types";

  interface Props extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
    title: string;
    description?: string;
    items?: EnvelopeEvidenceItem[];
    footer?: Snippet;
    children?: Snippet;
  }

  let {
    ref = $bindable(null),
    class: className,
    title,
    description,
    items = [],
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
  <div class="space-y-1">
    <p class="font-semibold text-base text-foreground">{title}</p>
    {#if description}
      <p class="text-muted-foreground text-sm leading-6">{description}</p>
    {/if}
  </div>

  {#if items.length > 0}
    <div class="mt-4 divide-y divide-border/60 overflow-hidden rounded-[1.25rem] border border-border/60 bg-background/60">
      {#each items as item (`${item.label}-${item.value}`)}
        <div class="flex items-start justify-between gap-4 px-4 py-3">
          <div class="min-w-0">
            <p
              class="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.18em]"
            >
              {item.label}
            </p>
            {#if item.detail}
              <p class="mt-1 text-muted-foreground text-xs leading-5">
                {item.detail}
              </p>
            {/if}
          </div>

          {#if item.href}
            <a
              class={cn(
                "truncate text-right font-semibold text-sm hover:underline",
                item.mono && "font-mono text-[13px]",
                item.tone ? envelopeToneTextClasses[item.tone] : "text-foreground"
              )}
              href={item.href}
              target="_blank"
              rel="noreferrer"
            >
              {item.value}
            </a>
          {:else}
            <p
              class={cn(
                "truncate text-right font-semibold text-sm text-foreground",
                item.mono && "font-mono text-[13px]",
                item.tone && envelopeToneTextClasses[item.tone]
              )}
            >
              {item.value}
            </p>
          {/if}
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
