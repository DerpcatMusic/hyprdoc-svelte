<script lang="ts">
  import { colord } from "colord";
  import { onMount, untrack } from "svelte";

  interface Props {
    value: string; // Hex
    onChange: (color: string) => void;
    autoStartDrag?: boolean;
  }

  let { value, onChange, autoStartDrag = false }: Props = $props();

  // Internal state in HSV for easier UI mapping
  // H: 0-360, S: 0-100, V: 0-100
  let hue = $state(0);
  let saturation = $state(0);
  let brightness = $state(100);
  let isDragging = $state(false);
  let saturationBrightnessRef = $state<HTMLDivElement | null>(null);
  let hueTrackRef = $state<HTMLDivElement | null>(null);

  // Sync internal state when prop changes externally (and not dragging)
  $effect(() => {
    if (!isDragging && value) {
      untrack(() => {
        const c = colord(value || "#000000");
        const hsv = c.toHsv();
        hue = hsv.h;
        saturation = hsv.s;
        brightness = hsv.v;
      });
    }
  });

  onMount(() => {
    if (autoStartDrag) {
      startSbDrag(null);
    }
  });

  // Derived colors for UI
  const hueColor = $derived(`hsl(${hue}, 100%, 50%)`);
  const currentColor = $derived(
    colord({ h: hue, s: saturation, v: brightness }).toHex()
  );

  // ━━━ HANDLERS ━━━

  function updateColor() {
    const hex = colord({ h: hue, s: saturation, v: brightness }).toHex();
    onChange(hex);
  }

  function getClientCoordinates(e: MouseEvent | TouchEvent) {
    if ("touches" in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  }

  // Saturation/Brightness Box Handlers
  function handleSbMouseDown(e: MouseEvent | TouchEvent) {
    startSbDrag(e);
  }

  function startSbDrag(e: MouseEvent | TouchEvent | null) {
    isDragging = true;
    if (e) handleSbMove(e);
    window.addEventListener("mousemove", handleSbMove);
    window.addEventListener("touchmove", handleSbMove);
    window.addEventListener("mouseup", stopSbDrag);
    window.addEventListener("touchend", stopSbDrag);
  }

  function handleSbMove(e: MouseEvent | TouchEvent) {
    const target = saturationBrightnessRef;
    if (!target) return;
    const box = target.getBoundingClientRect();

    const coords = getClientCoordinates(e);
    const x = Math.max(0, Math.min(1, (coords.x - box.left) / box.width));
    const y = Math.max(0, Math.min(1, (coords.y - box.top) / box.height));

    saturation = Math.round(x * 100);
    brightness = Math.round((1 - y) * 100);
    updateColor();
  }

  function stopSbDrag() {
    isDragging = false;
    window.removeEventListener("mousemove", handleSbMove);
    window.removeEventListener("touchmove", handleSbMove);
    window.removeEventListener("mouseup", stopSbDrag);
    window.removeEventListener("touchend", stopSbDrag);
  }

  // Hue Slider Handlers
  function handleHueMouseDown(e: MouseEvent | TouchEvent) {
    startHueDrag(e);
  }

  function startHueDrag(e: MouseEvent | TouchEvent) {
    isDragging = true;
    handleHueMove(e);
    window.addEventListener("mousemove", handleHueMove);
    window.addEventListener("touchmove", handleHueMove);
    window.addEventListener("mouseup", stopHueDrag);
    window.addEventListener("touchend", stopHueDrag);
  }

  function handleHueMove(e: MouseEvent | TouchEvent) {
    const target = hueTrackRef;
    if (!target) return;
    const track = target.getBoundingClientRect();

    const coords = getClientCoordinates(e);
    const x = Math.max(0, Math.min(1, (coords.x - track.left) / track.width));
    hue = Math.round(x * 360);
    updateColor();
  }

  function stopHueDrag() {
    isDragging = false;
    window.removeEventListener("mousemove", handleHueMove);
    window.removeEventListener("touchmove", handleHueMove);
    window.removeEventListener("mouseup", stopHueDrag);
    window.removeEventListener("touchend", stopHueDrag);
  }
</script>

<div class="flex flex-col gap-3 w-56 p-1 select-none">
  <!-- Saturation/Brightness Box -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={saturationBrightnessRef}
    class="relative w-full h-32 rounded-lg cursor-crosshair overflow-hidden border border-border/40 bg-white"
    style:background-color={hueColor}
    onmousedown={handleSbMouseDown}
  >
    <!-- White gradient (Left to Right) -->
    <div
      class="absolute inset-0 bg-gradient-to-r from-white to-transparent mix-blend-multiply"
    ></div>
    <!-- Black gradient (Top to Bottom) -->
    <div
      class="absolute inset-0 bg-gradient-to-b from-transparent to-black mix-blend-multiply"
    ></div>

    <!-- Handle -->
    <div
      class="absolute w-3 h-3 rounded-full border-2 border-white shadow-sm -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style:left="{saturation}%"
      style:top="{100 - brightness}%"
      style:background-color={currentColor}
    ></div>
  </div>

  <!-- Hue Slider -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={hueTrackRef}
    class="relative w-full h-3 rounded-full cursor-pointer border border-border/20"
    style:background="var(--hue-spectrum)"
    onmousedown={handleHueMouseDown}
  >
    <!-- Handle -->
    <div
      class="absolute w-4 h-4 rounded-full border-2 border-white shadow-sm -translate-x-1/2 top-1/2 -translate-y-1/2 bg-white pointer-events-none"
      style:left="{(hue / 360) * 100}%"
    ></div>
  </div>

  <!-- Output & Preview -->
  <div class="flex items-center gap-2">
    <div
      class="w-8 h-8 rounded-md border border-border shadow-sm"
      style:background-color={currentColor}
    ></div>
    <input
      type="text"
      value={currentColor.toUpperCase()}
      class="flex-1 h-8 rounded-md border border-input bg-transparent px-3 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-ring"
      onchange={(e: Event) => {
				const val = (e.currentTarget as HTMLInputElement).value;
				if (colord(val).isValid()) onChange(val);
			}}
    >
  </div>
</div>
