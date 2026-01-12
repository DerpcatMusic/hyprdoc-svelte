<script lang="ts">
	import { Book, Plus, Search } from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
</script>

<div class="flex h-full w-full flex-col font-sans bg-transparent">
	<!-- Header Area -->
	<div class="sticky top-0 z-20 flex flex-col gap-3 bg-card px-4 py-4 border-b border-border/30">
		<div class="flex items-center justify-between">
			<h2 class="font-display font-semibold text-foreground text-sm tracking-tight opacity-90">Glossary</h2>
			<Button
				size="icon"
				variant="ghost"
				class="h-6 w-6 rounded-full transition-all duration-300 hover:bg-primary hover:text-primary-foreground"
			>
				<Plus class="size-3.5" />
			</Button>
		</div>

		<div class="group relative w-full">
			<Search class="absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-primary" />
			<Input
				placeholder="Find term..."
				class="w-full h-8 rounded-lg border-transparent bg-muted/40 pl-8 text-xs transition-all focus-visible:bg-muted/60 focus-visible:ring-1 focus-visible:ring-primary/20"
			/>
		</div>
	</div>

	<!-- Empty State -->
	<div class="flex flex-1 flex-col items-center justify-center p-8 text-center">
		<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/20 text-muted-foreground/40">
			<Book class="size-8" />
		</div>
		<p class="font-semibold text-sm text-foreground/80">No terms defined</p>
		<p class="mt-1 text-xs text-muted-foreground max-w-[200px] leading-relaxed">
			Create glossary terms to define key concepts across your documents.
		</p>
		<Button variant="outline" size="sm" class="mt-4 border-border/50 text-xs">
			Create First Term
		</Button>
	</div>
</div>
