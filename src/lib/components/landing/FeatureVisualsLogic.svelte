<script lang="ts">
  import { cn } from "$lib/utils";
</script>

<div class="relative flex h-full min-h-[500px] w-full items-center justify-center p-4">
  <div class="relative h-[450px] w-full max-w-2xl">
    <!-- WINDOW 1: SMART VARIABLE -->
      <div class="absolute top-0 left-0 z-10 w-[240px] animate-bounce-slow text-left">
        <div class="absolute -top-8 left-0 flex items-center gap-2 text-primary">
          <span class="font-mono text-[10px] uppercase tracking-widest">Inject Data</span>
        </div>
        <div class="group rounded-xl border border-slate-200 bg-white p-4 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-black/80">
          <div class="mb-3 flex items-center gap-2 border-primary/30 border-b pb-2">
            <div class="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
            <span class="font-bold font-mono text-[10px] text-primary uppercase tracking-widest">Data Node</span>
          </div>
          <div class="flex flex-col gap-2">
            <code class="w-fit rounded bg-primary/20 px-2 py-1 font-mono text-primary text-xs">{"{{ today }}"}</code>
            <div class="font-bold font-sans text-slate-800 text-xl dark:text-foreground">Oct 14, 2026</div>
          </div>
        </div>
      </div>

    <!-- WINDOW 2: CONDITIONAL LOGIC -->
    <div class="absolute top-[80px] right-0 z-20 w-[280px] animate-bounce-slow text-left" style="animation-delay: 0.5s">
      <div class="absolute -top-8 right-0 flex items-center justify-end gap-2 text-primary">
        <span class="font-mono text-[10px] uppercase tracking-widest">Control Flow</span>
      </div>
      <div class="group rounded-xl border border-slate-200 bg-white p-5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-black/80">
        <div class="mb-3 flex items-center justify-between border-primary/30 border-b pb-2">
          <span class="font-bold font-mono text-[10px] text-primary uppercase tracking-widest">Logic Engine</span>
          <span class="rounded bg-primary px-1.5 py-0.5 font-bold font-mono text-[9px] text-primary-foreground">RULE</span>
        </div>
        <div class="space-y-3">
          <div class="flex items-center gap-2 text-muted-foreground text-xs">
            <span class="font-bold text-primary">IF</span> Value {">"} $10k
          </div>
          <div class="relative border-primary border-l-2 pl-3">
            <p class="font-medium text-slate-800 text-sm dark:text-foreground">"Require VP Approval signature"</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
