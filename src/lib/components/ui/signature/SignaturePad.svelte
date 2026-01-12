<script lang="ts">
import { onMount } from 'svelte';
import { Button } from '$lib/components/ui/button';
import { cn } from '$lib/utils';

interface Props {
	value?: string | null; // Base64 image
	onchange?: (value: string | null) => void;
	class?: string;
	placeholder?: string;
}

let { value = $bindable(null), onchange, class: className, placeholder = "Sign here" }: Props = $props();

let canvas = $state<HTMLCanvasElement>();
let ctx = $state<CanvasRenderingContext2D | null>(null);
let isDrawing = $state(false);
let hasContent = $state(false);

onMount(() => {
	if (!canvas) { return; }
	ctx = canvas.getContext('2d');
	if (ctx) {
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.lineWidth = 2;
		ctx.strokeStyle = '#000';
	}

	// Resize canvas to parent container
	const resize = () => {
		if (!canvas) { return; }
		const rect = canvas.getBoundingClientRect();
		// Scale for DPI if needed, but keeping it simple for now
		canvas.width = rect.width;
		canvas.height = rect.height;
		
		// If we had a value, we'd redraw it here, but base64 to canvas is async
		if (value) {
			const img = new Image();
			img.onload = () => ctx?.drawImage(img, 0, 0);
			img.src = value;
		}
	};

	resize();
	window.addEventListener('resize', resize);
	return () => window.removeEventListener('resize', resize);
});

function startDrawing(e: MouseEvent | TouchEvent) {
	isDrawing = true;
	hasContent = true;
	const pos = getPos(e);
	ctx?.beginPath();
	ctx?.moveTo(pos.x, pos.y);
}

function draw(e: MouseEvent | TouchEvent) {
	if (!(isDrawing && ctx)) { return; }
	const pos = getPos(e);
	ctx.lineTo(pos.x, pos.y);
	ctx.stroke();
}

function stopDrawing() {
	if (!isDrawing) { return; }
	isDrawing = false;
	save();
}

function getPos(e: MouseEvent | TouchEvent) {
	if (!canvas) { return { x: 0, y: 0 }; }
	const rect = canvas.getBoundingClientRect();
	const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
	const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
	return {
		x: clientX - rect.left,
		y: clientY - rect.top
	};
}

function clear() {
	if (!(ctx && canvas)) { return; }
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	value = null;
	hasContent = false;
	onchange?.(null);
}

function save() {
	if (!canvas) { return; }
	const data = canvas.toDataURL('image/png');
	value = data;
	onchange?.(data);
}
</script>

<div class={cn("relative flex flex-col gap-2 bg-background border rounded-md overflow-hidden", className)}>
	<canvas
		bind:this={canvas}
		onmousedown={startDrawing}
		onmousemove={draw}
		onmouseup={stopDrawing}
		onmouseleave={stopDrawing}
		ontouchstart={(e: TouchEvent) => { e.preventDefault(); startDrawing(e); }}
		ontouchmove={(e: TouchEvent) => { e.preventDefault(); draw(e); }}
		ontouchend={stopDrawing}
		class="w-full h-40 cursor-crosshair touch-none"
	></canvas>

	{#if !hasContent && !value}
		<div class="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/30 font-medium italic">
			{placeholder}
		</div>
	{/if}

	<div class="absolute bottom-2 right-2 flex gap-2">
		<Button variant="outline" size="sm" class="h-8 px-2 text-[10px]" onclick={clear}>
			Clear
		</Button>
	</div>
</div>
