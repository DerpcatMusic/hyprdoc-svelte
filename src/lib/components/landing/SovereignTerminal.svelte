<script lang="ts">
  import { ShieldCheck, TerminalSquare, Lock } from "lucide-svelte";
  import { cn } from "$lib/utils";

  let { animate = true, className = "" } = $props<{ animate?: boolean; className?: string }>();
</script>

<div
  class={cn(
    "terminal-window relative w-full max-w-4xl overflow-hidden rounded-t-[2rem] border-white/10 border-t border-r border-l bg-[#050505] shadow-[0_-20px_60px_rgba(0,0,0,0.9)] ring-1 ring-white/5 backdrop-blur-3xl",
    className
  )}
>
  <div class="flex items-center justify-between border-white/5 border-b bg-white/5 px-6 py-4">
    <div class="flex items-center gap-2">
        <div class="flex gap-2">
          <div class="h-3 w-3 rounded-full bg-neutral-700/50"></div>
          <div class="h-3 w-3 rounded-full bg-neutral-700/50"></div>
          <div class="h-3 w-3 rounded-full bg-neutral-700/50"></div>
        </div>
      <div class="ml-4 flex items-center gap-2 rounded bg-black/40 px-3 py-1">
        <TerminalSquare class="h-3 w-3 text-neutral-500" />
        <span class="font-bold font-mono text-neutral-400 text-xs uppercase tracking-widest">
          Governance Protocol
        </span>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span class="status-badge flex items-center gap-1.5 rounded-full border border-emerald-500/10 bg-emerald-950/30 px-3 py-1 font-bold text-[10px] text-emerald-400 uppercase ring-1 ring-emerald-500/30">
        <ShieldCheck class="h-3 w-3" />
        Sovereign Layer Active
      </span>
    </div>
  </div>

  <div class="space-y-4 p-8 font-mono text-sm md:p-12 text-left">
    <div class="flex gap-3 text-neutral-500">
      <span>$</span>
      <span class="text-white">initialize_sovereign_governance --audit</span>
    </div>
    <div class="text-emerald-500 animate-in fade-in duration-500 delay-200 fill-mode-both">
      {">"} Verifying Private Keys... VALID
    </div>
    <div class="text-emerald-500 animate-in fade-in duration-500 delay-400 fill-mode-both">
      {">"} Establishing Decentralized Logic... DONE
    </div>
    <div class="text-emerald-500 animate-in fade-in duration-500 delay-600 fill-mode-both">
      {">"} Governance Mesh Orchestration... STABLE
    </div>
    <br />

    <div class="grid grid-cols-1 gap-12 pt-8 md:grid-cols-2 text-left">
      <div class="space-y-4">
        <h2 class="font-bold font-display text-4xl text-white uppercase tracking-tighter md:text-5xl leading-none italic">
          Zero Trust.
          <br />
          Total Control.
        </h2>
        <p class="font-sans text-neutral-400 leading-relaxed text-base">
          Advanced governance infrastructure for enterprise-grade agreements. Orchestrate your
          own nodes, manage sovereign keys, and ensure absolute data integrity.
        </p>
      </div>
      <div class="flex items-center justify-center">
          <div class="relative">
            <div class="absolute inset-0 animate-pulse rounded-full bg-emerald-500/20 blur-xl"></div>
            <Lock class="relative z-10 h-32 w-32 text-emerald-500/80 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          </div>
      </div>
    </div>
  </div>
</div>
