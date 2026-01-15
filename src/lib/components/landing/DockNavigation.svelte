<script lang="ts">
  import { cn } from "$lib/utils";
  import { Briefcase, LayoutDashboard, Menu, X } from "lucide-svelte";
  import { onMount } from "svelte";
  import ThemeToggle from "./ThemeToggle.svelte";
  import MobileMenu from "./MobileMenu.svelte";

  interface Props {
    activeSection: number;
    setActiveSection: (idx: number) => void;
    className?: string;
  }

  let { activeSection, setActiveSection, className }: Props = $props();

  let isCorporate = $state(false);
  let mobileMenuOpen = $state(false);

  onMount(() => {
    const saved = localStorage.getItem("corporate-mode");
    if (saved === "true") {
      isCorporate = true;
      document.documentElement.setAttribute("data-corporate-mode", "true");
      document.body.classList.add("corporate");
    }
  });

  function toggleCorporate() {
    isCorporate = !isCorporate;
    localStorage.setItem("corporate-mode", String(isCorporate));

    if (isCorporate) {
      document.documentElement.setAttribute("data-corporate-mode", "true");
      document.body.classList.add("corporate");
    } else {
      document.documentElement.removeAttribute("data-corporate-mode");
      document.body.classList.remove("corporate");
    }

    window.dispatchEvent(new CustomEvent("corporate-mode-change", { detail: isCorporate }));
  }
</script>

<div
  class={cn(
    "flex items-center gap-1 rounded-full border border-border bg-card/80 backdrop-blur-xl p-2 shadow-sm transition-all duration-300 hover:border-primary/50",
    "scale-90 md:scale-100",
    className
  )}
>
  <!-- LINKS (Desktop) -->
  <div class="hidden items-center px-4 md:flex gap-1">
    <button
      type="button"
      onclick={() => setActiveSection(1)}
      class="rounded-full px-4 py-2 font-medium font-sans text-muted-foreground text-sm transition-all hover:bg-accent hover:text-primary"
    >
      Features
    </button>
    <button
      type="button"
      onclick={() => setActiveSection(2)}
      class="rounded-full px-4 py-2 font-medium font-sans text-muted-foreground text-sm transition-all hover:bg-accent hover:text-primary"
    >
      Comparison
    </button>
    <button
      type="button"
      onclick={() => setActiveSection(3)}
      class="rounded-full px-4 py-2 font-medium font-sans text-muted-foreground text-sm transition-all hover:bg-accent hover:text-primary"
    >
      Pricing
    </button>
  </div>


  <div class="mx-1 hidden h-6 w-px bg-border md:block"></div>

  <!-- MOBILE MENU TOGGLE -->
  <button
    type="button"
    class="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-accent md:hidden"
    onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
  >
    {#if mobileMenuOpen}
      <X size={20} />
    {:else}
      <Menu size={20} />
    {/if}
  </button>

  <a
    href="/signup"
    class="hidden whitespace-nowrap rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95 md:block"
  >
    Get Started
  </a>

  <div class="mx-2 hidden h-8 w-px bg-border md:block"></div>

  <!-- UTILS -->
  <div class="hidden items-center gap-1 md:flex">
    <ThemeToggle />
    <div class="mx-1 h-8 w-px bg-border"></div>
    <button
      type="button"
      onclick={toggleCorporate}
      class={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition-all",
        isCorporate
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Briefcase size={18} />
    </button>
  </div>
</div>

<MobileMenu
  isOpen={mobileMenuOpen}
  onClose={() => (mobileMenuOpen = false)}
  onScrollTo={setActiveSection}
  {isCorporate}
  onToggleCorporate={toggleCorporate}
/>
