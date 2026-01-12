<script lang="ts">
	import LandingLayout from '$lib/components/landing/LandingLayout.svelte';
	import LandingDropzone from '$lib/components/landing/LandingDropzone.svelte';
	import Footer from '$lib/components/landing/Footer.svelte';
	import ThemeToggle from '$lib/components/landing/ThemeToggle.svelte';

	const title = 'HyprSign - Quick & Secure PDF Signing | HyprDoc';
</script>

<LandingLayout>
	<main class="overflow-hidden bg-background text-foreground min-h-screen">
		<!-- Simple Header -->
		<header class="fixed top-0 left-0 right-0 z-[100] p-6">
			<nav class="mx-auto flex max-w-7xl items-center justify-between">
				<a href="/" class="flex items-center gap-2 transition-transform hover:scale-105">
					<div class="h-10 w-10 overflow-hidden rounded-xl bg-primary p-2 shadow-lg">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="white"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
						</svg>
					</div>
					<span class="font-extrabold font-display text-2xl tracking-tighter">HyprSign.</span>
				</a>
				<div class="flex items-center gap-4">
					<ThemeToggle />
					<a
						href="/auth/login"
						class="rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground text-sm transition-all hover:scale-105 active:scale-95"
					>
						Sign Up
					</a>
				</div>
			</nav>
		</header>

		<!-- Hero Section -->
		<section class="relative pt-32 pb-16 lg:pt-48 lg:pb-24">
			<!-- Background decoration -->
			<div class="pointer-events-none absolute inset-0 z-0 overflow-hidden">
				<div
					class="absolute -right-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-primary/10 blur-[120px]"
				></div>
				<div
					class="absolute -bottom-1/4 -left-1/4 h-1/2 w-1/2 rounded-full bg-primary/5 blur-[120px]"
				></div>
			</div>

			<div class="container relative z-10 mx-auto px-4 text-center">
				<div
					class="mb-6 inline-flex animate-fade-in-up items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-medium text-primary text-sm"
				>
					<span class="i-lucide-sparkles h-3.5 w-3.5"></span>
					<span>New: AI-Powered Quick Signing</span>
				</div>

				<h1
					class="mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text font-bold text-4xl text-transparent tracking-tight md:text-6xl"
				>
					Sign documents as fast <br class="hidden md:block" /> as you scan them.
				</h1>

				<p class="mx-auto mb-10 max-w-2xl text-muted-foreground text-lg md:text-xl">
					Stop struggling with complex e-signature tools. Upload your PDF, let our AI detect the
					fields, and sign in seconds.
				</p>

				<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
					<button
						class="w-full rounded-xl bg-primary px-8 py-4 font-semibold text-lg text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:bg-primary/90 sm:w-auto"
					>
						Start Signing for Free
					</button>
					<a
						href="#how-it-works"
						class="w-full rounded-xl border border-border bg-background/50 px-8 py-4 font-semibold text-lg backdrop-blur-sm transition-all hover:bg-muted/50 sm:w-auto"
					>
						How it works
					</a>
				</div>

				<LandingDropzone />
			</div>
		</section>

		<!-- Features Grid -->
		<section id="how-it-works" class="bg-muted/30 py-24">
			<div class="container mx-auto px-4">
				<div class="mb-16 text-center">
					<h2 class="mb-4 text-3xl font-bold">Why use HyprSign?</h2>
					<p class="text-muted-foreground">
						The most lightweight and powerful way to handle individual signing tasks.
					</p>
				</div>

				<div class="grid gap-8 md:grid-cols-3">
					<div
						class="group rounded-2xl border border-border bg-background p-8 transition-all hover:border-primary/30"
					>
						<div
							class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110"
						>
							<span class="i-lucide-zap h-6 w-6"></span>
						</div>
						<h3 class="mb-3 text-xl font-bold">Instant Setup</h3>
						<p class="text-muted-foreground">
							No account required for your first sign. Just upload and go.
						</p>
					</div>
					<div
						class="group rounded-2xl border border-border bg-background p-8 transition-all hover:border-primary/30"
					>
						<div
							class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110"
						>
							<span class="i-lucide-sparkles h-6 w-6"></span>
						</div>
						<h3 class="text-xl font-bold mb-3">AI Auto-Fill</h3>
						<p class="text-muted-foreground">
							Our AI automatically detects names, dates, and signature lines.
						</p>
					</div>
					<div
						class="group rounded-2xl border border-border bg-background p-8 transition-all hover:border-primary/30"
					>
						<div
							class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110"
						>
							<span class="i-lucide-shield-check h-6 w-6"></span>
						</div>
						<h3 class="mb-3 text-xl font-bold">Bank-Grade Security</h3>
						<p class="text-muted-foreground">
							Your documents are encrypted and processed with the highest standards.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- CTA Section -->
		<section class="relative overflow-hidden py-24 text-center">
			<div class="absolute inset-0 bg-primary/5"></div>
			<div class="container relative z-10 mx-auto px-4">
				<h2 class="mb-8 font-bold italic text-3xl md:text-5xl">Ready to sign?</h2>
				<p class="mx-auto mb-12 max-w-xl italic text-muted-foreground text-xl">
					Join thousands of professionals who save hours every week using HyprSign.
				</p>

				<div class="flex flex-col items-center justify-center gap-6 sm:flex-row">
					<a
						href="/auth/login"
						class="w-full rounded-2xl bg-primary px-10 py-5 font-bold text-primary-foreground text-xl shadow-xl shadow-primary/20 transition-all hover:scale-105 hover:bg-primary/90 sm:w-auto"
					>
						Try it Now
					</a>
					<p class="font-medium text-muted-foreground">No credit card required</p>
				</div>
			</div>
		</section>
	</main>

	<Footer />
</LandingLayout>
