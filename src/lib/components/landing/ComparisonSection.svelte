<script lang="ts">
  import { Check, X, Zap, Cpu, Lock, Activity, Globe, DatabaseZap, ShieldCheck, ArrowRightLeft } from "lucide-svelte";
  import { onMount } from "svelte";
  import gsap from "gsap";
  import { ScrollTrigger } from "gsap/ScrollTrigger";
  import { cn } from "$lib/utils";

  if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }

  const COMPARISONS = [
    {
      feature: "Data Synchronization",
      icon: Activity,
      legacy: "Manual Refresh / Polling",
      hyprdoc: "Real-time Optimistic Updates",
      meta: "Sub-10ms Latency"
    },
    {
      feature: "Document Model",
      icon: Cpu,
      legacy: "Static Templates / PDFs",
      hyprdoc: "Dynamic Object-Model Architecture",
      meta: "Variable-Injectable Schema"
    },
    {
      feature: "Security & Trust",
      icon: Lock,
      legacy: "Standard Encryption",
      hyprdoc: "End-to-End Sovereignty",
      meta: "Zero-Trust Protocol"
    },
    {
      feature: "Integration Flow",
      icon: ArrowRightLeft,
      legacy: "Loose API Endpoints",
      hyprdoc: "Deep Infrastructure Embedding",
      meta: "Orchestration SDK"
    }
  ];

  let sectionRef = $state<HTMLElement>();

  onMount(() => {
    if (sectionRef) {
      gsap.from(".comp-card", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef,
          start: "top 70%",
        }
      });
    }
  });
</script>

<section bind:this={sectionRef} id="comparison" class="relative w-full px-8 py-40 overflow-hidden bg-background">
  <div class="mx-auto max-w-7xl relative z-10">
    <div class="grid lg:grid-cols-12 gap-20 items-center">
      
      <div class="lg:col-span-5 space-y-10">
        <div class="space-y-6">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
            Architecture Differential
          </div>
          <h2 class="font-black font-display text-6xl text-foreground uppercase tracking-tight leading-[0.95]">
            Platform <br />
            <span class="text-primary">Differential.</span>
          </h2>
          <p class="text-lg text-muted-foreground font-medium border-l-2 border-primary/30 pl-8 leading-relaxed">
            Don't just sign PDFs. <span class="text-foreground font-bold">Compute them.</span> <br/>
            HyprDoc is a full-stack execution environment for legal logic.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4 p-8 rounded-3xl border border-border bg-card/30 backdrop-blur-sm">
           <div class="space-y-1">
              <span class="text-[10px] uppercase font-bold text-muted-foreground">Encryption</span>
              <p class="text-sm font-bold text-foreground">AES-256-GCM</p>
           </div>
           <div class="space-y-1">
              <span class="text-[10px] uppercase font-bold text-muted-foreground">Compliance</span>
              <p class="text-sm font-bold text-foreground">SOC 2 Type II</p>
           </div>
        </div>
      </div>

      <div class="lg:col-span-7 space-y-4">
        {#each COMPARISONS as item}
          <div class="comp-card grid grid-cols-1 md:grid-cols-12 gap-6 p-8 rounded-[2rem] border border-border bg-card/40 backdrop-blur-xl transition-all hover:border-primary/20 hover:bg-card/60 group shadow-sm">
            
            <div class="md:col-span-4 flex items-center gap-4">
              <div class="h-12 w-12 flex items-center justify-center rounded-2xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                <item.icon class="text-primary group-hover:scale-110 transition-transform" size={20} />
              </div>
              <div class="flex flex-col">
                <h3 class="font-bold text-lg text-foreground tracking-tight leading-none uppercase">{item.feature}</h3>
                <span class="text-[8px] font-mono uppercase text-muted-foreground mt-1">Node ID: {Math.random().toString(16).slice(2, 8).toUpperCase()}</span>
              </div>
            </div>

            <div class="md:col-span-4 flex flex-col justify-center border-l border-border/50 pl-8">
              <div class="flex items-center gap-2 mb-1">
                <X size={10} class="text-rose-500/50" />
                <span class="text-[9px] font-bold text-rose-500/60 uppercase tracking-widest">Legacy Method</span>
              </div>
              <p class="text-muted-foreground font-medium text-sm leading-relaxed">{item.legacy}</p>
            </div>

            <div class="md:col-span-4 flex flex-col justify-center bg-primary/5 rounded-2xl p-5 border border-primary/10 shadow-sm relative overflow-hidden group-hover:bg-primary/10 transition-colors">
              <div class="flex items-center gap-2 mb-1">
                <Check size={10} class="text-primary" stroke-width={4} />
                <span class="text-[9px] font-bold text-primary uppercase tracking-widest italic">Sovereign Layer</span>
              </div>
              <p class="text-foreground font-bold text-base italic tracking-tight">{item.hyprdoc}</p>
              <div class="h-1 w-full bg-primary/10 rounded-full mt-3 overflow-hidden">
                 <div class="h-full bg-primary/40 w-full -translate-x-1/2 animate-pulse"></div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
