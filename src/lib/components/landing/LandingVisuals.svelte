<script lang="ts" module>
  import { Shield, Globe, Database, Braces, Lock } from "lucide-svelte";
  import type { Component } from "svelte";

  export const INTEGRATION_ITEMS = [
    { icon: Globe, label: "Zapier", color: "text-orange-400" },
    { icon: Database, label: "Postgres", color: "text-blue-400" },
    { icon: Braces, label: "API", color: "text-green-400" },
    { icon: Lock, label: "Auth0", color: "text-white" },
  ];
</script>

<script lang="ts">
  import { cn } from "$lib/utils";
  const { children, className } = $props<{ children?: any, className?: string }>();
</script>

{#snippet FeaturePill({ icon: Icon, text, className }: { icon: Component, text: string, className?: string })}
  <div
    class={cn(
      "flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-md",
      className
    )}
  >
    <Icon class="h-3.5 w-3.5 text-primary" />
    <span class="font-semibold text-white/80 text-xs uppercase tracking-wide">{text}</span>
  </div>
{/snippet}

{#snippet MockCodeSnippet()}
  <div class="relative overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A]/90 p-4 shadow-2xl backdrop-blur-md">
    <div class="mb-3 flex gap-1.5">
      <div class="h-2.5 w-2.5 rounded-full bg-red-500/20"></div>
      <div class="h-2.5 w-2.5 rounded-full bg-yellow-500/20"></div>
      <div class="h-2.5 w-2.5 rounded-full bg-green-500/20"></div>
    </div>
    <div class="font-mono text-[10px] text-muted-foreground leading-relaxed">
      <div class="flex gap-2">
        <span class="text-purple-400">if</span>
        <span class="text-white">(</span>
        <span class="text-blue-400">deal_value</span>
        <span class="text-white">&gt;</span>
        <span class="text-orange-400">100k</span>
        <span class="text-white">)</span>
        <span class="text-white">{"{"}</span>
      </div>
      <div class="flex gap-2 pl-4">
        <span class="text-yellow-400">require_approval</span>
        <span class="text-white">(</span>
        <span class="text-green-400">"VP_LEGAL"</span>
        <span class="text-white">);</span>
      </div>
      <div class="flex gap-2">
        <span class="text-white">{"}"}</span>
        <span class="text-purple-400">else</span>
        <span class="text-white">{"{"}</span>
      </div>
      <div class="flex gap-2 pl-4">
        <span class="text-yellow-400">auto_sign</span>
        <span class="text-white">();</span>
      </div>
      <div class="text-white">{"}"}</div>
    </div>
  </div>
{/snippet}

{#snippet IntegrationGrid()}
  <div class="grid grid-cols-2 gap-2">
    {#each INTEGRATION_ITEMS as item}
      <div
        class="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition-colors hover:bg-white/[0.05]"
      >
        <item.icon class={cn("h-4 w-4", item.color)} />
        <span class="font-medium text-muted-foreground text-xs">{item.label}</span>
      </div>
    {/each}
  </div>
{/snippet}

{#snippet LiveCursorMock()}
  <div class="relative h-24 w-48 rounded-lg border border-white/10 border-dashed bg-white/[0.01] p-2">
    <div class="absolute top-8 left-12 flex items-center gap-1">
      <div class="h-4 w-4">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
        >
          <path
            d="M2 2L6.15 13.5L8.5 8.5L13.5 6.15L2 2Z"
            fill="#A855F7"
            stroke="white"
            stroke-width="1.5"
          />
        </svg>
      </div>
      <div class="rounded-full bg-purple-500 px-2 py-0.5 font-bold text-[8px] text-white">
        Sarah is typing...
      </div>
    </div>
    <div class="mt-8 ml-16 h-2 w-16 rounded-full bg-white/5"></div>
    <div class="mt-2 ml-16 h-2 w-24 rounded-full bg-white/5"></div>
  </div>
{/snippet}

{#snippet SecurityBadge()}
  <div class="flex w-fit items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/5 px-4 py-2 backdrop-blur-sm">
    <div class="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
      <Shield class="h-4 w-4 text-green-500" />
    </div>
    <div>
      <div class="font-bold text-green-500 text-xs uppercase tracking-wider">SOC2 Type II</div>
      <div class="text-[10px] text-green-500/60">Certified & Compliant</div>
    </div>
  </div>
{/snippet}
