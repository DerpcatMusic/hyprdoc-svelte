<script lang="ts">
  import { Check } from "lucide-svelte";
  import { onMount } from "svelte";
  import { cn } from "$lib/utils";
  import gsap from "gsap";

  const TIERS = [
    {
      name: "Free",
      price: "$0",
      period: "/forever",
      description: "For individuals & prototypes.",
      features: [
        "3 Active Agreements",
        "Shared Governance Core",
        "Real-time Collaboration",
        "Standard Encryption",
      ],
      buttonText: "Start for free",
      href: "/signup",
      highlight: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "/user/mo",
      description: "For growing teams.",
      features: [
        "Unlimited Agreements",
        "Private Infrastructure Nodes",
        "Priority Execution",
        "Deep API Integration",
        "Custom Branding"
      ],
      buttonText: "Get Pro Access",
      href: "/signup?plan=pro",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large-scale operations.",
      features: [
        "SLA Performance Guarantees",
        "Dedicated Server Clusters",
        "White-label Deployment",
        "Full System Analytics",
      ],
      buttonText: "Contact Sales",
      href: "mailto:sales@hyprdoc.com",
      highlight: false,
    },
  ];

  let sectionRef = $state<HTMLElement>();

  onMount(() => {
    if (sectionRef) {
      gsap.from(sectionRef.querySelectorAll(".pricing-card"), {
        y: 30,
        // opacity: 0, REMOVED to prevent invisible cards bug
        duration: 0.6,
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

<section id="pricing" bind:this={sectionRef} class="relative w-full px-6 py-32 bg-slate-50 dark:bg-black border-t border-border">
  <div class="mx-auto max-w-7xl">
    <div class="mb-20 text-center">
      <h2 class="mb-6 font-display font-black text-5xl text-foreground tracking-tight md:text-7xl">
        Transparent <span class="text-primary">Pricing.</span>
      </h2>
      <p class="mx-auto max-w-2xl font-bold text-xl text-muted-foreground">
        No hidden fees. No "Envelope Taxes". Just pay for what you use.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
      {#each TIERS as tier}
        <div
          class={cn(
            "pricing-card relative flex flex-col p-8 rounded-[2rem] transition-all",
            tier.highlight 
              ? "bg-black text-white dark:bg-white dark:text-black shadow-2xl scale-105 z-10" 
              : "bg-white dark:bg-[#111] border border-border"
          )}
        >
          {#if tier.highlight}
             <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-black px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
               Best Value
             </div>
          {/if}

          <div class="mb-8">
            <h3 class="font-display font-bold text-3xl tracking-tight mb-2">{tier.name}</h3>
            <p class="font-medium opacity-70 text-sm mb-6">{tier.description}</p>
            <div class="flex items-baseline gap-1">
              <span class="font-display font-black text-5xl tracking-tight">{tier.price}</span>
              <span class="font-medium opacity-60 text-sm">{tier.period}</span>
            </div>
          </div>

          <div class="flex-1 space-y-4 mb-10">
            {#each tier.features as feature}
              <div class="flex items-start gap-3">
                <div class={cn("mt-1 flex items-center justify-center rounded-full p-0.5", tier.highlight ? "bg-primary text-black" : "bg-primary/20 text-primary")}>
                  <Check size={12} strokeWidth={4} />
                </div>
                <span class="font-bold text-sm opacity-90">{feature}</span>
              </div>
            {/each}
          </div>

          <a
            href={tier.href}
            class={cn(
              "w-full py-4 rounded-full font-black text-center text-sm uppercase tracking-wide transition-transform active:scale-95",
              tier.highlight
                ? "bg-primary text-black hover:brightness-110"
                : "bg-slate-100 dark:bg-zinc-800 text-foreground hover:bg-slate-200 dark:hover:bg-zinc-700"
            )}
          >
            {tier.buttonText}
          </a>
        </div>
      {/each}
    </div>
  </div>
</section>
