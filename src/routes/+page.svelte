<script lang="ts">
	import LandingLayout from '$lib/components/landing/LandingLayout.svelte';
	import Navbar from '$lib/components/landing/Navbar.svelte';
	import HeroSection from '$lib/components/landing/HeroSection.svelte';
	import FeaturesGrid from '$lib/components/landing/FeaturesGrid.svelte';
	import PinnedBentoShowcase from '$lib/components/landing/PinnedBentoShowcase.svelte';
	import ComparisonSection from '$lib/components/landing/ComparisonSection.svelte';
	import PricingSection from '$lib/components/landing/PricingSection.svelte';
	import CTASection from '$lib/components/landing/CTASection.svelte';
	import Footer from '$lib/components/landing/Footer.svelte';

	let activeSection = $state(0);

	function setActiveSection(index: number) {
		activeSection = index;
		const sections = ['hero', 'features', 'collab', 'pricing'];
		const element = document.getElementById(sections[index]);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' });
		}
	}
</script>

<LandingLayout>
	<Navbar {activeSection} {setActiveSection} />

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

	<Footer />
</LandingLayout>
