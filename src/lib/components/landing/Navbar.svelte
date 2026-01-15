<script lang="ts">
  import DockNavigation from "./DockNavigation.svelte";
  import { Button } from "$lib/components/ui/button";
  import { ArrowRight, Menu } from "lucide-svelte";
  import { useNav } from "$lib/stores/nav-state.svelte";

  interface Props {
    activeSection: number;
    setActiveSection: (idx: number) => void;
  }

  let { 
    activeSection = "hero", 
    setActiveSection = (id: string) => {} 
  } = $props();

  const nav = useNav();
</script>

<!-- Navbar: Flat White/Black, Sticky, High Contrast -->
<nav class="fixed top-0 left-0 right-0 z-[50] w-full border-b border-border bg-background px-6 py-4 transition-all duration-300">
  <div class="mx-auto flex max-w-7xl items-center justify-between">
    <!-- Logo -->
    <a href="/" class="flex items-center gap-2 group">
      <img src="/logo.svg" alt="HyprDoc Logo" class="h-8 w-8 dark:invert group-hover:rotate-12 transition-transform" />
      <span class="font-display font-bold text-2xl tracking-tight text-foreground">HyprDoc</span>
    </a>

    <!-- Desktop Links -->
    <div class="hidden md:flex items-center gap-8">
      <a href="/features" class="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Features</a>
      <a href="/vitals" class="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Vitals</a>
      <a href="/pricing" class="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Pricing</a>
    </div>

      <!-- Auth Actions -->
      <div class="flex items-center gap-3">
        <button 
          onclick={() => nav.toggleAuth(true)}
          class="hidden text-sm font-bold text-foreground/80 transition-colors hover:text-foreground md:block"
        >
          Log in
        </button>
        <button 
          onclick={() => nav.toggleAuth(true)}
          class="group flex items-center gap-2 rounded-full bg-[#9FE870] px-5 py-2.5 text-sm font-black text-black transition-all hover:scale-105 active:scale-95"
        >
          Get started
          <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
  </div>
</nav>

<!-- Spacer to prevent content overlap -->
<div class="h-[72px]"></div>
