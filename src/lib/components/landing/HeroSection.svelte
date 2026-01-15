<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { ArrowRight, Check } from "lucide-svelte";
  import { onMount } from "svelte";
  import gsap from "gsap";
  import { useNav } from "$lib/stores/nav-state.svelte";

  const nav = useNav();

  let heroRef = $state<HTMLElement>();

  onMount(() => {
    if (heroRef) {
      // Simple, snappy reveal. No floaty fade-ins.
      gsap.from(heroRef.querySelectorAll(".reveal"), {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out"
      });
    }
  });
</script>

<section
  bind:this={heroRef}
  id="hero"
  class="relative flex min-h-[90vh] w-full flex-col items-center justify-center px-6 pt-12 pb-16 text-center overflow-hidden bg-background"
>
  <div class="z-10 flex max-w-5xl flex-col items-center gap-8">
    
    <!-- Social Proof / Badge -->
    <div class="reveal flex items-center gap-2 rounded-full bg-secondary/50 px-4 py-1.5 text-xs font-bold text-secondary-foreground">
      <span class="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
      Running on Cloudflare Edge.
    </div>

    <!-- Main Title: Massive & Bold -->
    <h1 class="reveal font-display font-black text-6xl text-foreground tracking-tight sm:text-7xl md:text-8xl lg:text-9xl leading-[0.9] text-center w-full">
      Documents that<br />
      <span class="text-primary selection:bg-black selection:text-white">do the work.</span>
    </h1>

    <!-- Subtitle: Simple & Direct -->
    <p class="reveal max-w-2xl text-balance font-medium text-muted-foreground text-xl md:text-2xl leading-relaxed tracking-normal mt-4">
      Draft, sign, and automate without the headache. <br class="hidden sm:block"/>
      The fastest way to agree on things.
    </p>

    <!-- CTAs -->
    <div class="reveal mt-8 flex flex-col items-center gap-4 sm:flex-row">
      <button
        onclick={() => nav.toggleAuth(true)}
        class="group relative overflow-hidden rounded-full bg-[#9FE870] px-12 py-6 font-black text-2xl text-black transition-all hover:scale-105 active:scale-95 shadow-[0_8px_0_rgb(0,0,0,0.1)] active:shadow-none active:translate-y-[4px]"
      >
        <span>GET STARTED</span>
      </button>
    </div>

    <!-- Trust Signals -->
    <div class="reveal mt-16 flex flex-col items-center gap-4 text-sm font-bold text-muted-foreground/60">
      <p>TRUSTED BY SMART TEAMS</p>
      <div class="flex gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-300">
        <!-- Placeholders for logos -->
        <div class="h-8 w-24 bg-current rounded"></div>
        <div class="h-8 w-24 bg-current rounded"></div>
        <div class="h-8 w-24 bg-current rounded"></div>
        <div class="h-8 w-24 bg-current rounded"></div>
      </div>
    </div>

  </div>
</section>
