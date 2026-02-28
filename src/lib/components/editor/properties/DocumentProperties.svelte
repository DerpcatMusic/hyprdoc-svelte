<script lang="ts">
	import { useEditorBrain } from "$lib/editor/core/EditorBrain.svelte";
	import * as Accordion from "$lib/components/ui/accordion";
	import SmartColorPicker from "$lib/components/editor/properties/SmartColorPicker.svelte";
	import FontPicker from "$lib/components/editor/properties/FontPicker.svelte";
	import PrecisionInput from "$lib/components/editor/properties/PrecisionInput.svelte";
	import { getTextureOptions, generateTextureCSS } from "$lib/utils/textures";
	import { Label } from "$lib/components/ui/label";
	import { Input } from "$lib/components/ui/input";
	import { Button } from "$lib/components/ui/button";
	import { Switch } from "$lib/components/ui/switch";
	import { EDITOR_PANEL_LAYOUT } from "$lib/styles/editor-layout";
	import { HYPR_DEFAULT_TEXT_COLOR } from "$lib/styles/ui-palette";
	import { 
		LayoutTemplate, 
		Palette, 
		Ruler, 
		ArrowRightLeft,
		Type as TypeIcon,
		FileText
	} from "lucide-svelte";
	import { cn } from "$lib/utils";
	import type { DocumentSettings } from "@/convex/domains/settings";

	// Init Brain
	const brain = useEditorBrain();
	const settings = $derived(brain.settings);

	// Unit Conversion Logic
	type Unit = "px" | "in" | "cm";
	let unit = $state<Unit>("px");
	
	const UNITS: Record<Unit, number> = {
		px: 1,
		in: 96,
		cm: 37.795
	};

	function toUnit(pixels: number): number {
		const val = pixels / UNITS[unit];
		return val; // Let PrecisionInput handle rounding for display
	}

	function fromUnit(val: number): number {
		return val * UNITS[unit]; // Store raw calculation
	}

	const textureOptions: { value: string; label: string }[] = getTextureOptions();
	const allTextures = [
        { value: 'none', label: 'None' },
        ...textureOptions
    ];

	const accordionTriggerClass = "px-4 py-3 hover:bg-muted/50 group hover:no-underline";
	const accordionContentCompactClass = "px-4 pb-4 space-y-4";
	const accordionContentClass = "px-4 pb-4 space-y-5";

	function setPreset(w: number, h: number) {
		brain.updateSettings({ pageWidth: w, pageHeight: h });
	}

	function toggleOrientation() {
		brain.updateSettings({
			pageWidth: settings.pageHeight,
			pageHeight: settings.pageWidth
		});
	}

	function update(updates: Partial<DocumentSettings>) {
		brain.updateSettings(updates);
	}

	function handleFontSizeChange(v: number) {
		// If there is an active selection (more than 0 characters), apply font size to selection
		if (brain.selection && brain.selection.from !== brain.selection.to) {
			brain.setFontSize(v);
		} else {
			// Otherwise update the global document base size
			update({ fontSize: v });
		}
	}
</script>

<div class={cn("h-full w-full bg-sidebar-background", EDITOR_PANEL_LAYOUT.bodyScroll)}>
	<!-- Header: Title -->
	<div class={EDITOR_PANEL_LAYOUT.header}>
		<Label class="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 mb-2 block">Document Title</Label>
		<Input 
			value={brain.title} 
			oninput={(e: Event) => brain.title = (e.currentTarget as HTMLInputElement).value}
			class="h-9 bg-background/50 focus-visible:bg-background transition-all font-bold"
			placeholder="Enter document title..."
		/>
	</div>

	<Accordion.Root type="multiple" class="w-full" value={["layout", "appearance", "typography", "margins"]}>
		
		<!-- PAGE LAYOUT -->
		<Accordion.Item value="layout" class="border-border/50">
			<Accordion.Trigger class={accordionTriggerClass}>
				<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground group-data-[state=open]:text-primary transition-colors">
					<LayoutTemplate class="size-3.5" />
					Page Setup
				</div>
			</Accordion.Trigger>
			<Accordion.Content class={accordionContentCompactClass}>
				<!-- Unit Selector -->
				<div class="flex items-center justify-between">
					<Label class="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Units</Label>
					<div class="flex rounded-md border bg-background/50 p-0.5">
						{#each ["px", "in", "cm"] as u}
							<button
								class={cn(
									"px-2 py-0.5 text-[9px] font-bold uppercase rounded-sm transition-all",
									unit === u ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
								)}
								onclick={() => unit = u as Unit}
							>
								{u}
							</button>
						{/each}
					</div>
				</div>

				<!-- Presets -->
				<div class="grid grid-cols-2 gap-2">
					<Button 
						variant="outline" 
						size="sm" 
						class="h-8 text-[10px] bg-background/50 hover:bg-background transition-all uppercase font-bold"
						onclick={() => setPreset(816, 1056)}
					>
						Letter
						<span class="ml-1 text-[9px] opacity-50 font-normal">8.5x11</span>
					</Button>
					<Button 
						variant="outline" 
						size="sm" 
						class="h-8 text-[10px] bg-background/50 hover:bg-background transition-all uppercase font-bold"
						onclick={() => setPreset(794, 1123)}
					>
						A4
						<span class="ml-1 text-[9px] opacity-50 font-normal">210x297</span>
					</Button>
				</div>

				<!-- Dimensions -->
				<div class="flex items-center gap-3">
					<PrecisionInput 
						label="Width"
						value={toUnit(settings.pageWidth)}
						onChange={(v) => update({ pageWidth: fromUnit(v) })}
						unitDisplay={unit}
						isFloat={unit !== 'px'}
						step={unit === 'px' ? 1 : 0.1}
					/>
					
					<Button 
						variant="ghost" 
						size="icon" 
						class="size-8 mt-1 shrink-0 text-muted-foreground hover:text-primary hover:bg-muted rounded-full"
						onclick={toggleOrientation}
						title="Swap Dimensions"
					>
						<ArrowRightLeft class="size-3" />
					</Button>

					<PrecisionInput 
						label="Height"
						value={toUnit(settings.pageHeight)}
						onChange={(v) => update({ pageHeight: fromUnit(v) })}
						unitDisplay={unit}
						isFloat={unit !== 'px'}
						step={unit === 'px' ? 1 : 0.1}
					/>
				</div>
			</Accordion.Content>
		</Accordion.Item>

		<!-- APPEARANCE -->
		<Accordion.Item value="appearance" class="border-border/50">
			<Accordion.Trigger class={accordionTriggerClass}>
				<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground group-data-[state=open]:text-primary transition-colors">
					<Palette class="size-3.5" />
					Aesthetics
				</div>
			</Accordion.Trigger>
			<Accordion.Content class={accordionContentClass}>
				<!-- Color -->
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label class="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Background</Label>
						<SmartColorPicker 
							value={settings.backgroundColor} 
							onColorSelect={(v) => update({ backgroundColor: v })}
							label="Page Color"
							className="w-full h-9 rounded-md"
						/>
					</div>

					<div class="space-y-2">
						<Label class="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Texture Tint</Label>
						<SmartColorPicker 
							value={settings.paperTextureColor} 
							onColorSelect={(v) => update({ paperTextureColor: v })}
							label="Texture Color"
							className="w-full h-9 rounded-md"
						/>
					</div>
				</div>

				<!-- Texture -->
				<div class="space-y-2">
					<Label class="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Paper Texture</Label>
					<div class="grid grid-cols-5 gap-2">
						{#each allTextures as tex}
							<button
								class={cn(
									"relative aspect-square rounded-md border overflow-hidden transition-all hover:border-primary/50 focus:outline-none",
									settings.paperTexture === tex.value ? "border-primary ring-2 ring-primary/10" : "bg-background/50 border-border/50"
								)}
								onclick={() => update({ paperTexture: tex.value })}
								title={tex.label}
							>
								{#if tex.value === 'none'}
									<div class="size-full flex items-center justify-center text-muted-foreground/30" style="background-color: {settings.backgroundColor}">
										<span class="text-[8px] font-bold uppercase tracking-tighter">None</span>
									</div>
								{:else}
									<div 
										class="absolute inset-0" 
										style="background-color: {settings.backgroundColor}; background-image: {generateTextureCSS(tex.value, { 
											color: settings.paperTextureColor || HYPR_DEFAULT_TEXT_COLOR, 
											opacity: 1, 
											scale: 1 
										})}"
									></div>
								{/if}
								{#if settings.paperTexture === tex.value}
									<div class="absolute bottom-0 inset-x-0 h-0.5 bg-primary"></div>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Texture Opacity -->
				{#if settings.paperTexture !== 'none'}
					<div class="pt-1">
						<PrecisionInput 
							label="Texture Intensity"
							value={settings.paperTextureOpacity * 100}
							onChange={(v) => update({ paperTextureOpacity: v / 100 })}
							unitDisplay="%"
							min={0}
							max={100}
							step={1}
						/>
					</div>
				{/if}
			</Accordion.Content>
		</Accordion.Item>

		<!-- TYPOGRAPHY -->
		<Accordion.Item value="typography" class="border-border/50">
			<Accordion.Trigger class={accordionTriggerClass}>
				<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground group-data-[state=open]:text-primary transition-colors">
					<TypeIcon class="size-3.5" />
					Typography
				</div>
			</Accordion.Trigger>
			<Accordion.Content class={accordionContentClass}>
				<div class="space-y-2">
					<Label class="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Base Font</Label>
					<FontPicker 
						value={settings.fontBody}
						onValueChange={(v) => update({ fontBody: v })}
						placeholder="Select Base Font..."
					/>
				</div>

				<div class="space-y-2">
					<Label class="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Title Font</Label>
					<FontPicker 
						value={settings.fontTitle}
						onValueChange={(v) => update({ fontTitle: v })}
						placeholder="Select Title Font..."
					/>
				</div>

				<!-- Typography Settings -->
				<div class="space-y-4">
					<div class="grid grid-cols-2 gap-3">
						<PrecisionInput 
							label="Font Size"
							value={brain.fontSize ?? settings.fontSize}
							onChange={handleFontSizeChange}
							unitDisplay="px"
							min={8}
							max={144}
						/>
						<PrecisionInput 
							label="Line Height"
							value={settings.lineHeight}
							onChange={(v) => update({ lineHeight: v })}
							isFloat={true}
							step={0.05}
							min={0.1}
							max={10}
						/>
					</div>
				</div>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="margins" class="border-border/50">
			<Accordion.Trigger class={accordionTriggerClass}>
				<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground group-data-[state=open]:text-primary transition-colors">
					<Ruler class="size-3.5" />
					Margins & Guides
				</div>
			</Accordion.Trigger>
			<Accordion.Content class={accordionContentClass}>
				<div class="grid grid-cols-2 gap-4">
					<PrecisionInput 
						label="Vertical" 
						value={toUnit(settings.marginVertical)} 
						onChange={(v) => update({ marginVertical: fromUnit(v) })}
						unitDisplay={unit}
						isFloat={unit !== 'px'}
					/>
					<PrecisionInput 
						label="Horizontal" 
						value={toUnit(settings.marginHorizontal)} 
						onChange={(v) => update({ marginHorizontal: fromUnit(v) })}
						unitDisplay={unit}
						isFloat={unit !== 'px'}
					/>
				</div>

				<!-- Visual Tools Section -->
				<div class="pt-2 border-t border-border/30">
					<Label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Visual Tools</Label>
					
					<div class="flex flex-col gap-3">
						<!-- Rulers Toggle -->
						<div class="flex items-center justify-between">
							<Label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer" for="show-rulers">Show Rulers</Label>
							<Switch 
								id="show-rulers"
								checked={brain.showRulers}
								onCheckedChange={(v: boolean) => brain.showRulers = v}
							/>
						</div>

						<!-- Snap to Elements -->
						<div class="flex items-center justify-between">
							<div class="flex flex-col">
								<Label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer" for="snap-elements">Snap to Elements</Label>
								<span class="text-[8px] text-muted-foreground/60">Align to text, lines & centers</span>
							</div>
							<Switch 
								id="snap-elements"
								checked={brain.snapToElements}
								onCheckedChange={(v: boolean) => brain.snapToElements = v}
							/>
						</div>

						<!-- Custom Guides Hint -->
						<p class="text-[8px] text-muted-foreground/50 italic">
							Double-click rulers to add guides
						</p>
					</div>
				</div>

				<!-- Original Margin toggles -->
				<div class="pt-2 border-t border-border/30 flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<Label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer" for="show-margins">Show Margin Guides</Label>
						<Switch 
							id="show-margins"
							checked={settings.showMargins}
							onCheckedChange={(v: boolean) => update({ showMargins: v })}
						/>
					</div>
					<div class="flex items-center justify-between">
						<Label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer" for="mirror-margins">Mirror Layout</Label>
						<Switch 
							id="mirror-margins"
							checked={settings.mirrorMargins}
							onCheckedChange={(v: boolean) => update({ mirrorMargins: v })}
						/>
					</div>
				</div>
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>

	<div class="p-8 text-center opacity-10">
		<FileText class="mx-auto size-6 mb-2" />
		<span class="text-[8px] font-bold uppercase tracking-[0.3em]">HyprDoc Studio v4.0</span>
	</div>
</div>
