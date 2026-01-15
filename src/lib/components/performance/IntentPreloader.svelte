<script lang="ts">
  import { onMount } from "svelte";
  import { preloadData } from "$app/navigation";
  import { useEventListener } from "runed";

  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;

  // Preload set to avoid redundant calls
  const preloaded = new Set<string>();

  useEventListener(typeof window !== "undefined" ? window : null, "mousemove", (e: MouseEvent) => {
    const now = performance.now();
    const dt = now - lastTime;
    if (dt < 20) return; // Rate limit

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const velocity = Math.sqrt(dx * dx + dy * dy) / dt;

    // High velocity threshold (px/ms)
    if (velocity > 0.5) {
      // Find elements in the general direction of movement
      // For simplicity, we check elements under the projected path or just nearby elements
      // A more 'invasive' approach is to check what's near the cursor when it's moving fast
      
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      
      if (link && link.href && !preloaded.has(link.href)) {
        const url = new URL(link.href, window.location.origin);
        if (url.origin === window.location.origin) {
          try {
            preloadData(url.pathname);
            preloaded.add(link.href);
            console.log(`[Intent] Fast movement detected towards ${url.pathname}, preloading...`);
          } catch (e) {
            // Ignore preload errors for external or invalid links
            console.warn(`[Intent] Failed to preload ${url.pathname}`, e);
          }
        }
      }
    }

    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = now;
  });
</script>
