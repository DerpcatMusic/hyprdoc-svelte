<script lang="ts">
  import { onMount } from "svelte";

  let mouseFollower = $state<HTMLDivElement>();

  onMount(() => {
    let animationFrameId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.1;
      currentY += (targetY - currentY) * 0.1;

      if (mouseFollower) {
        mouseFollower.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%)`;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  });
</script>

<div class="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
  <!-- Layer 1: Base Flow - Slow Drift -->
  <div
    class="absolute -top-[50%] -left-[50%] h-[200%] w-[200%] opacity-40 animate-drift"
    style="background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--primary), transparent 85%) 0%, transparent 50%);"
  ></div>

  <!-- Layer 2: Accent Nebulas - Medium Speed -->
  <div class="absolute top-0 right-0 h-[800px] w-[800px] rounded-full bg-accent/5 blur-[120px] animate-float1"></div>
  <div class="absolute bottom-0 left-0 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[100px] animate-float2"></div>

  <!-- Layer 3: Mouse Follower - Interactive "Torch" -->
  <div
    bind:this={mouseFollower}
    class="absolute top-0 left-0 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[100px] will-change-transform"
  ></div>

  <!-- Layer 4: Noise Overlay -->
  <div
    class="absolute inset-0 z-[1] opacity-[0.03] mix-blend-overlay"
    style="background-image: url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E&quot;);"
  ></div>
</div>

<style>
  @keyframes drift {
    0% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.1) rotate(5deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
  @keyframes float1 {
    0% { transform: translate(0px, 0px); }
    50% { transform: translate(100px, -50px); }
    100% { transform: translate(0, 0); }
  }
  @keyframes float2 {
    0% { transform: translate(0px, 0px); }
    50% { transform: translate(-100px, 50px); }
    100% { transform: translate(0, 0); }
  }
  :global(.animate-drift) { animation: drift 20s infinite linear; }
  :global(.animate-float1) { animation: float1 15s infinite ease-in-out; }
  :global(.animate-float2) { animation: float2 18s infinite ease-in-out; }
</style>
