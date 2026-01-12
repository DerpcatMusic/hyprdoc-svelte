<script lang="ts">
	import { useDocument } from '$lib/editor/core/editor-context';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { Slider } from '$lib/components/ui/slider';
	import { Palette, Type, LayoutTemplate, Wifi } from 'lucide-svelte';
	import FontPicker from './FontPicker.svelte';
	import { getTextureOptions } from '$lib/utils/textures';

	const doc = useDocument();
	
	const PAPER_SIZES = [
		{ label: 'A4', width: 794, height: 1123 },
		{ label: 'US Letter', width: 816, height: 1056 },
		{ label: 'Legal', width: 816, height: 1344 },
	];
</script>

<div class="flex flex-col gap-6 p-4">
	<!-- Typography -->
	<div class="space-y-4">
		<div class="flex items-center gap-2 text-foreground/80">
			<Type class="size-4" />
			<h3 class="font-semibold text-xs uppercase tracking-wider">Typography</h3>
		</div>
		
		<div class="grid gap-3">
			<div class="space-y-1.5">
				<Label class="text-xs text-muted-foreground">Heading Font</Label>
				<FontPicker bind:value={doc.documentSettings.current.fontHeading} />
			</div>

			<div class="space-y-1.5">
				<Label class="text-xs text-muted-foreground">Body Font</Label>
				<FontPicker bind:value={doc.documentSettings.current.fontBody} />
			</div>

			<div class="space-y-3 pt-2">
				<div class="flex items-center justify-between">
					<Label class="text-xs text-muted-foreground">Base Font Size (px)</Label>
					<span class="text-xs font-mono text-muted-foreground">{doc.documentSettings.current.fontSize}px</span>
				</div>
				<Slider
					value={[doc.documentSettings.current.fontSize]}
					onValueChange={(v: number[]) => doc.documentSettings.current.fontSize = v[0]}
					min={10}
					max={32}
					step={1}
					class="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
				/>
			</div>
		</div>
	</div>

	<Separator />

	<!-- Layout -->
	<div class="space-y-4">
		<div class="flex items-center gap-2 text-foreground/80">
			<LayoutTemplate class="size-4" />
			<h3 class="font-semibold text-xs uppercase tracking-wider">Page Layout</h3>
		</div>

		<div class="grid gap-3">
			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-1.5">
					<Label class="text-xs text-muted-foreground">Width (px)</Label>
					<Input 
						type="number" 
						bind:value={doc.documentSettings.current.pageWidth} 
						class="h-8"
					/>
				</div>
				<div class="space-y-1.5">
					<Label class="text-xs text-muted-foreground">Height (px)</Label>
					<Input 
						type="number" 
						bind:value={doc.documentSettings.current.pageHeight} 
						class="h-8"
					/>
				</div>
			</div>

			<div class="flex flex-wrap gap-2 pt-1">
				{#each PAPER_SIZES as size}
					<button
						type="button"
						class="rounded-md border bg-secondary/20 px-2 py-1 text-[10px] hover:bg-secondary/40 transition-colors"
						onclick={() => {
							doc.documentSettings.current.pageWidth = size.width;
							doc.documentSettings.current.pageHeight = size.height;
						}}
					>
						{size.label}
					</button>
				{/each}
			</div>

			<div class="grid grid-cols-2 gap-3 pt-2">
				<div class="space-y-1.5">
					<Label class="text-xs text-muted-foreground">V-Margin</Label>
					<Input 
						type="number" 
						bind:value={doc.documentSettings.current.marginVertical} 
						class="h-8"
					/>
				</div>
				<div class="space-y-1.5">
					<Label class="text-xs text-muted-foreground">H-Margin</Label>
					<Input 
						type="number" 
						bind:value={doc.documentSettings.current.marginHorizontal} 
						class="h-8"
					/>
				</div>
			</div>
		</div>
	</div>

	<Separator />

	<!-- Appearance -->
	<div class="space-y-4">
		<div class="flex items-center gap-2 text-foreground/80">
			<Palette class="size-4" />
			<h3 class="font-semibold text-xs uppercase tracking-wider">Appearance</h3>
		</div>

		<div class="grid gap-6">
			<!-- Texture Selection -->
			<div class="space-y-3">
				<Label class="text-xs text-muted-foreground uppercase tracking-wider font-mono">Pattern Style</Label>
				<div class="grid grid-cols-3 gap-2">
					<button
						type="button"
						class={doc.documentSettings.current.paperTexture === 'none' 
							? "flex flex-col items-center justify-center gap-1 h-12 rounded-md border text-[10px] font-medium transition-all bg-foreground text-background"
							: "flex flex-col items-center justify-center gap-1 h-12 rounded-md border bg-background hover:bg-muted text-[10px] font-medium transition-all"}
						onclick={() => doc.documentSettings.current.paperTexture = 'none'}
					>
						<span>None</span>
					</button>
					{#each getTextureOptions() as texture}
						<button
							type="button"
							class={doc.documentSettings.current.paperTexture === texture.value
								? "flex flex-col items-center justify-center gap-1 h-12 rounded-md border border-primary bg-primary text-primary-foreground text-[10px] font-medium transition-all shadow-sm"
								: "flex flex-col items-center justify-center gap-1 h-12 rounded-md border bg-background hover:bg-muted text-[10px] font-medium transition-all"}
							onclick={() => doc.documentSettings.current.paperTexture = texture.value as any}
						>
							<span>{texture.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Colors -->
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label class="text-xs text-muted-foreground uppercase tracking-wider font-mono">Base Color</Label>
					<div class="flex items-center gap-2">
						<Input 
							type="color" 
							bind:value={doc.documentSettings.current.paperColor} 
							class="h-8 w-full p-1 cursor-pointer"
						/>
					</div>
				</div>

				{#if doc.documentSettings.current.paperTexture !== 'none'}
					<div class="space-y-2">
						<Label class="text-xs text-muted-foreground uppercase tracking-wider font-mono">Texture Color</Label>
						<div class="flex items-center gap-2">
							<Input 
								type="color" 
								value={doc.documentSettings.current.paperTextureColor || '#000000'}
								oninput={(e: any) => doc.documentSettings.current.paperTextureColor = e.currentTarget.value}
								class="h-8 w-full p-1 cursor-pointer"
							/>
						</div>
					</div>
				{/if}
			</div>

			<!-- Advanced Texture Controls -->
			{#if doc.documentSettings.current.paperTexture !== 'none'}
				<div class="space-y-5 border-t border-border/50 pt-5 animate-in slide-in-from-top-2 fade-in">
					<!-- Intensity -->
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<Label class="text-xs font-medium">Intensity</Label>
							<span class="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
								{Math.round(doc.documentSettings.current.paperTextureOpacity * 100)}%
							</span>
						</div>
						<Slider
							value={[doc.documentSettings.current.paperTextureOpacity]}
							onValueChange={(v: number[]) => doc.documentSettings.current.paperTextureOpacity = v[0]}
							min={0}
							max={1}
							step={0.05}
							class="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
						/>
					</div>

					<!-- Scale -->
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<Label class="text-xs font-medium">Scale</Label>
							<span class="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
								{(doc.documentSettings.current.paperTextureScale ?? 1).toFixed(1)}x
							</span>
						</div>
						<Slider
							value={[doc.documentSettings.current.paperTextureScale ?? 1]}
							onValueChange={(v: number[]) => doc.documentSettings.current.paperTextureScale = v[0]}
							min={0.2}
							max={3}
							step={0.1}
							class="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
						/>
					</div>

					<!-- Noise Type -->
					{#if doc.documentSettings.current.paperTexture === 'noise'}
						<div class="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/10 p-2">
							<Label class="text-xs font-medium text-muted-foreground">Noise Type</Label>
							<div class="flex rounded-md border border-border bg-background p-0.5 shadow-sm">
								<button
									type="button"
									class={doc.documentSettings.current.paperTextureMonochromatic 
										? "rounded-sm px-3 py-1 text-[10px] font-medium bg-primary/10 text-primary shadow-sm transition-all"
										: "rounded-sm px-3 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-all"}
									onclick={() => doc.documentSettings.current.paperTextureMonochromatic = true}
								>
									Mono
								</button>
								<button
									type="button"
									class={!doc.documentSettings.current.paperTextureMonochromatic 
										? "rounded-sm px-3 py-1 text-[10px] font-medium bg-indigo-500/10 text-indigo-500 shadow-sm transition-all"
										: "rounded-sm px-3 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-all"}
									onclick={() => doc.documentSettings.current.paperTextureMonochromatic = false}
								>
									RGB
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<Separator />
	
	<!-- Advanced -->
	<div class="space-y-4">
		<div class="flex items-center gap-2 text-foreground/80">
			<Wifi class="size-4" />
			<h3 class="font-semibold text-xs uppercase tracking-wider">Real-Time</h3>
		</div>
		
		<div class="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/10 p-3">
			<div class="space-y-0.5">
				<Label class="text-xs font-medium">Collaboration</Label>
				<div class="text-[10px] text-muted-foreground">Enable multiplayer editing</div>
			</div>
			<Switch bind:checked={doc.documentSettings.current.realTimeEnabled} />
		</div>
	</div>
</div>
