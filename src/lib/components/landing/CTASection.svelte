<script lang="ts">
  import { ArrowRight } from "lucide-svelte";
  import { onMount } from "svelte";
  import gsap from "gsap";

  let sectionRef = $state<HTMLElement>();

  onMount(() => {
    if (sectionRef) {
      gsap.from(sectionRef.querySelector(".cta-content"), {
        scale: 0.9,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef,
          start: "top 80%",
        }
      });
    }
  });
</script>

<section bind:this={sectionRef} class="relative w-full bg-primary px-4 py-24 text-primary-foreground overflow-hidden">
  <div class="mx-auto max-w-4xl text-center">
    <div class="cta-content flex flex-col items-center gap-12">
      <div class="space-y-4">
        <h2 class="font-black font-display text-5xl tracking-tighter md:text-8xl leading-none uppercase">
          Ready for <br />
          <span class="text-white opacity-40">Hyper Speed?</span>
        </h2>
      </div>
      
      <p class="max-w-2xl font-medium text-xl text-primary-foreground/80 md:text-2xl border-l-4 border-white/20 pl-8 text-left">
        Join the organizations building <span class="text-white font-bold underline decoration-white/30 underline-offset-8">intelligent, self-executing agreements.</span>
      </p>

      <div class="flex flex-col items-center gap-6 sm:flex-row">
        <a
          href="/signup"
          class="group flex items-center gap-4 rounded-full bg-white px-12 py-6 font-bold text-primary text-2xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10 italic"
        >
          Initialize Account
          <ArrowRight size={24} />
        </a>
      </div>
    </div>
  </div>
</section>
