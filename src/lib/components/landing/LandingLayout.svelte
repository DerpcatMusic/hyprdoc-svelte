<script lang="ts">
  import { onMount } from "svelte";
  import Navbar from "./Navbar.svelte";
  import Footer from "./Footer.svelte";
  import InteractiveBackground from "$lib/components/landing/InteractiveBackground.svelte"; 
  import InvasiveSeo from "$lib/components/seo/InvasiveSeo.svelte"; // Invasive SEO
  import IntentPreloader from "$lib/components/performance/IntentPreloader.svelte";
  import AuthModal from '$lib/components/auth/AuthModal.svelte';
  import { setNavState } from "$lib/stores/nav-state.svelte";

  interface Props {
    children: import('svelte').Snippet;
    activeSection?: string;
    setActiveSection?: (id: string) => void;
  }

  let { 
    children, 
    activeSection = "hero", 
    setActiveSection = (id: string) => {} 
  }: Props = $props();

  const nav = setNavState();

  // Expose toggle via context or store if needed, but for now pass as props
</script>

<InvasiveSeo 
  title="HyprDoc | Sovereign Legal Logic" 
  description="The world's first programmable document logic engine. 50ms sync. Zero-trust." 
/>
<IntentPreloader />

<div class="marketing-root min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-black">
  <InteractiveBackground />
  
  <Navbar {activeSection} {setActiveSection} />

  <div class="flex flex-col"> 
     {@render children()}
  </div>

  <Footer />

  <AuthModal bind:isOpen={nav.isAuthOpen} />
</div>
