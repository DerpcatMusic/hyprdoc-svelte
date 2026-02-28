<script lang="ts">
  import { onMount } from "svelte";
  import gsap from "gsap";
  import { ScrollTrigger } from "gsap/ScrollTrigger";
  import { Code2, GitBranch, Shield, Users } from "lucide-svelte";
  import { cn } from "$lib/utils";

  // Register GSAP plugin
  if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }

  let containerRef = $state<HTMLElement>();
  let cardRefs = $state<HTMLElement[]>([]);

  const CARDS = [
    {
      id: "logic",
      title: "Smart",
      subtitle: "Logic",
      description: "Contracts that think. Logic blocks that execute automatically.",
      icon: GitBranch,
      bgClass: "bg-surface-2 text-foreground border border-border/50", // Standard Card
      visualId: "logic"
    },
    {
      id: "collab",
      title: "Global",
      subtitle: "Sync",
      description: "Sub-50ms sync. Negotiate in real-time.",
      icon: Users,
      bgClass: "bg-primary text-primary-foreground border border-primary", // Primary Green Card
      visualId: "collab"
    },
    {
      id: "sovereign",
      title: "Data",
      subtitle: "Control",
      description: "Your data stays yours. Private nodes and zero-trust security.",
      icon: Shield,
      bgClass: "bg-surface-3 text-foreground border border-border/50", // Darker/Secondary Card
      visualId: "sovereign"
    },
    {
      id: "orchestration",
      title: "API",
      subtitle: "Scale",
      description: "Automate complex workflows. Connect to standard APIs.",
      icon: Code2,
      bgClass: "bg-foreground text-background border border-foreground", // Inverted / Monochrome
      visualId: "orchestration"
    },
  ];

  onMount(() => {
    if (!containerRef) return;

    const cards = cardRefs.filter(Boolean);
    if (!cards.length) return;

    // INITIAL LAYOUT
    cards.forEach((card, i) => {
      gsap.set(card, {
        left: i % 2 === 0 ? "0%" : "50%",
        top: i < 2 ? "0%" : "100%", // Start position for entering cards
        width: "50%",
        height: "100%",
        zIndex: 10 + i,
        opacity: i < 2 ? 1 : 0,
        scale: 0.95, 
      });

      if (i === 1) {
        gsap.set(card, { opacity: 1, top: "0%" });
      }
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef,
        start: "top top", // Pin immediately
        end: "+=2000",
        scrub: 0.5,
        pin: true,
      },
      defaults: { ease: "power2.inOut", duration: 0.5 },
    });

    // Pinned Sequence
    // 1. Move Card 0 (Top Left) Out, Move Card 2 (Bottom Left) In
    tl.to(cards[0], { xPercent: -100, opacity: 0, scale: 0.85 }); 
    tl.fromTo(cards[2], 
      { top: "100%", opacity: 0, scale: 1.1 },
      { top: "0%", opacity: 1, scale: 0.95 }, 
      "<" // Align start
    );

    // 2. Move Card 1 (Top Right) Out, Move Card 3 (Bottom Right) In
    tl.to(cards[1], { xPercent: 100, opacity: 0, scale: 0.85 }, "+=0.1"); // Slight delay for rhythm
    tl.fromTo(cards[3],
      { top: "100%", opacity: 0, scale: 1.1 },
      { top: "0%", opacity: 1, scale: 0.95 },
      "<"
    );

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  });
</script>

{#snippet VerticalBentoCard({ title, subtitle, description, icon: Icon, bgClass, visualId }: any)}
  <div
    class={cn(
      "group relative flex h-full w-full flex-col overflow-hidden rounded-[2rem] shadow-none transition-all",
      bgClass
    )}
  >
    <!-- Header Area -->
    <div class="relative z-10 p-10 pb-4 flex-none">
      <div class="mb-6 flex items-center justify-between">
        <div class="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
           <Icon class="h-8 w-8" strokeWidth={2.5} />
        </div>
      </div>

      <div class="space-y-4">
        <h3 class="font-display font-black text-5xl tracking-tight leading-[0.9]">
          {title}<br/>
          <span class="opacity-50">{subtitle}</span>
        </h3>
        <p class="max-w-md font-bold text-xl opacity-80 leading-relaxed">
          {description}
        </p>
      </div>
    </div>

    <!-- Visual Area (Fills remaining space) -->
    <div class="relative z-10 flex-1 w-full p-6 pt-0 overflow-hidden mt-auto">
       <div class="h-full w-full rounded-2xl bg-black/5 dark:bg-white/10 overflow-hidden relative border border-black/5">
          

           <!-- VISUAL: LOGIC (Node Graph) -->
           {#if visualId === 'logic'}
             <div class="absolute inset-0 flex items-center justify-center opacity-80">
                <div class="flex gap-4">
                  <div class="w-16 h-16 rounded-xl bg-current rotate-12 border-2 border-black/10"></div>
                  <div class="w-16 h-16 rounded-full bg-current -rotate-12 border-2 border-black/10"></div>
                </div>
                <!-- Connecting Line -->
                <div class="absolute h-2 w-32 bg-current rounded-full"></div>
             </div>
             <div class="absolute bottom-10 left-10 font-mono font-black text-4xl opacity-50">
                IF(SIGNED) -> PAY()
             </div>
           {/if}

           <!-- VISUAL: SYNC (Globe/Pulse) -->
           {#if visualId === 'collab'}
             <div class="absolute inset-0 flex items-center justify-center">
               <div class="w-48 h-48 rounded-full border-4 border-current opacity-40 animate-[spin_10s_linear_infinite]"></div>
               <div class="absolute w-32 h-32 rounded-full border-4 border-current opacity-60 animate-[spin_5s_linear_infinite_reverse]"></div>
               <div class="absolute w-12 h-12 bg-current rounded-full animate-pulse shadow-xl"></div>
             </div>
             <div class="absolute top-10 right-10 font-mono font-black text-3xl opacity-80">
                HEAD: 23ms
             </div>
           {/if}

           <!-- VISUAL: DATA (Lock/Shield) -->
           {#if visualId === 'sovereign'}
              <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-30">
                 {#each Array(5) as _}
                    <div class="w-3/4 h-4 bg-current rounded-full"></div>
                 {/each}
              </div>
              <div class="absolute inset-0 flex items-center justify-center">
                 <Shield class="w-40 h-40 drop-shadow-2xl" strokeWidth={3} />
              </div>
           {/if}

            <!-- VISUAL: API (Code) -->
           {#if visualId === 'orchestration'}
              <div class="absolute inset-0 p-12 font-mono text-lg font-bold leading-relaxed opacity-80">
                 <p>{`{`}</p>
                 <p class="pl-4">"contract_id": "ox123",</p>
                 <p class="pl-4">"status": "active",</p>
                 <p class="pl-4">"signers": [</p>
                 <p class="pl-8">"alice@corp.com",</p>
                 <p class="pl-8">"bob@dao.eth"</p>
                 <p class="pl-4">]</p>
                 <p>{`}`}</p>
              </div>
           {/if}

       </div>
    </div>
  </div>
{/snippet}

<section
  bind:this={containerRef}
  class="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-background py-32"
>
  <!-- Constrain height to viewport minus padding to ensure centering -->
  <div class="relative mx-auto h-[80vh] w-full max-w-[1600px] px-6">
    <div class="relative h-full w-full">
      {#each CARDS as card, i}
        <div
          bind:this={cardRefs[i]}
          class="absolute p-4 md:p-6"
          style="will-change: transform, left, top;"
        >
          {@render VerticalBentoCard(card)}
        </div>
      {/each}
    </div>
  </div>
</section>
