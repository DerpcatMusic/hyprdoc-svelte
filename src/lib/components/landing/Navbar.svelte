<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { cn } from "$lib/utils";
	
	const { activeSection, setActiveSection } = $props();
</script>

<header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="container flex h-14 items-center">
		<div class="mr-4 flex">
			<a class="mr-6 flex items-center space-x-2" href="/">
				<span class="font-bold">HyprDoc</span>
			</a>
			<nav class="flex items-center space-x-6 text-sm font-medium">
				<Button 
					variant="ghost" 
					onclick={() => setActiveSection(0)} 
					class={cn("px-2 h-auto hover:bg-transparent", activeSection === 0 ? 'text-foreground font-bold' : 'text-foreground/60')}
				>
					Features
				</Button>
				<Button 
					variant="ghost" 
					onclick={() => setActiveSection(1)} 
					class={cn("px-2 h-auto hover:bg-transparent", activeSection === 1 ? 'text-foreground font-bold' : 'text-foreground/60')}
				>
					Pricing
				</Button>
			</nav>
		</div>
		<div class="ml-auto flex items-center space-x-4">
			<Button variant="ghost" href="/login">Login</Button>
			<Button href="/signup">Get Started</Button>
		</div>
	</div>
</header>
