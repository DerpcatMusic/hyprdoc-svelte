<script lang="ts">
	import { Button } from "$lib/components/ui/button";
</script>

<section class="container grid items-center gap-6 pb-8 pt-6 md:py-10">
	<div class="flex max-w-[980px] flex-col items-start gap-2">
		<h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
			Beautifully designed components <br class="hidden sm:inline" />
			built with Radix UI and Tailwind CSS.
		</h1>
		<p class="max-w-[700px] text-lg text-muted-foreground">
			Accessible and customizable components that you can copy and paste into your apps. Free. Open Source. And Next.js 13 Ready.
		</p>
	</div>
	<div class="flex gap-4">
		<Button>Get Started</Button>
		<Button variant="outline">GitHub</Button>
	</div>
</section>
