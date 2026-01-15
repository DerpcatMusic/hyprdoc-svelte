<script lang="ts">
  import ComparisonSection from "$lib/components/landing/ComparisonSection.svelte";
  import CTASection from "$lib/components/landing/CTASection.svelte";
  import FeaturesGrid from "$lib/components/landing/FeaturesGrid.svelte";
  import HeroSection from "$lib/components/landing/HeroSection.svelte";
  import LandingLayout from "$lib/components/landing/LandingLayout.svelte";
  import PinnedBentoShowcase from "$lib/components/landing/PinnedBentoShowcase.svelte";
  import PricingSection from "$lib/components/landing/PricingSection.svelte";
  import { onMount } from "svelte";
  import { preloadData } from "$app/navigation";

  let activeSection = $state(0);

  function setActiveSection(index: number) {
    activeSection = index;
    const sections = ["hero", "features", "collab", "pricing"];
    const element = document.getElementById(sections[index]);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }

  onMount(() => {
    // Aggressive preloading of auth and dashboard for sub-100ms perceived latency
    preloadData("/login");
    preloadData("/signup");
    preloadData("/dashboard");
  });
</script>

<LandingLayout {activeSection} {setActiveSection}>
  <main class="relative overflow-x-hidden">
    <HeroSection />

    <div id="features">
      <FeaturesGrid />
    </div>

    <div id="collab">
      <PinnedBentoShowcase />
    </div>

    <ComparisonSection />

    <div id="pricing">
      <PricingSection />
    </div>

    <CTASection />
  </main>
</LandingLayout>
