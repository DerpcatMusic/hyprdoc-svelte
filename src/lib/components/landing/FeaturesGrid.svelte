<script lang="ts">
  import { Box, Code2, Layers, Lock, Shield, Zap, Globe, DatabaseZap, Activity, ShieldCheck } from "lucide-svelte";
  import { onMount } from "svelte";
  import gsap from "gsap";
  import { ScrollTrigger } from "gsap/ScrollTrigger";
  import { cn } from "$lib/utils";

  if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }

  const FEATURES = [
    {
      title: "Smart Payments",
      description: "Stripe integrated directly into the doc. Milestones releaes funds automatically.",
      icon: Zap,
      bg: "bg-surface-2 dark:bg-card border border-border/50",
      text: "text-lime-text dark:text-lime-400"
    },
    {
      title: "Logic & Visibility",
      description: "Show/hide sections based on signer inputs. Dynamic agreements.",
      icon: Box,
      bg: "bg-surface-2 dark:bg-card border border-border/50",
      text: "text-foreground"
    },
    {
      title: "Global Sync",
      description: "Google Docs style editing, but for structured legal data.",
      icon: Globe,
      bg: "bg-surface-2 dark:bg-card border border-border/50",
      text: "text-lime-text dark:text-lime-400"
    },
    {
      title: "API Connectors",
      description: "Pull live data (CRM, Stock Prices) directly into contract variables.",
      icon: DatabaseZap,
      bg: "bg-surface-2 dark:bg-card border border-border/50",
      text: "text-foreground"
    },
    {
      title: "Deadline Triggers",
      description: "Auto-expire contracts or escalate alerts when dates pass.",
      icon: Activity,
      bg: "bg-surface-2 dark:bg-card border border-border/50",
      text: "text-lime-text dark:text-lime-400"
    },
    {
      title: "Role-Based Access",
      description: "Granular permissions. Alice can sign, Bob can only view.",
      icon: ShieldCheck,
      bg: "bg-surface-2 dark:bg-card border border-border/50",
      text: "text-foreground"
    },
  ];

  let sectionRef = $state<HTMLElement>();

  onMount(() => {
    if (sectionRef) {
      gsap.from(sectionRef.querySelectorAll(".feature-card"), {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef,
          start: "top 85%",
        }
      });
    }
  });
</script>

<section bind:this={sectionRef} id="features" class="relative w-full bg-background px-6 py-32">
  <div class="mx-auto max-w-7xl">
    <div class="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
      <div>
        <h2 class="font-display font-black text-5xl text-foreground tracking-tight md:text-7xl leading-[0.9]">
          Built for <br/><span class="text-lime-text selection:bg-primary selection:text-primary-foreground">Scale.</span>
        </h2>
      </div>
      <p class="max-w-md font-bold text-xl text-muted-foreground leading-relaxed md:text-right">
        Redesigned foundation. <br class="hidden md:block"/>Speed, precision, sovereignty.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each FEATURES as feature}
        <div
          class="feature-card group flex flex-col items-start rounded-[1.5rem] bg-card p-8 border-2 border-transparent hover:border-border transition-colors hover:shadow-none"
        >
          <div class={cn("mb-6 flex h-14 w-14 items-center justify-center rounded-xl", feature.bg)}>
            <feature.icon class={cn(feature.text)} size={28} strokeWidth={2.5} />
          </div>
          <h3 class="mb-2 font-display font-bold text-foreground text-2xl tracking-tight">{feature.title}</h3>
          <p class="text-muted-foreground font-medium text-lg leading-snug opacity-80">{feature.description}</p>
        </div>
      {/each}
    </div>
  </div>
</section>
