<script lang="ts">
  import Loader2Icon from "@lucide/svelte/icons/loader-2";
  import type { ComponentProps } from "svelte";
  import { cn } from "$lib/utils.js";

  type Size = "xs" | "sm" | "md" | "lg" | "xl" | number;

  interface Props extends Omit<ComponentProps<typeof Loader2Icon>, "size"> {
    size?: Size;
  }

  const { class: className, size = "md", ...restProps }: Props = $props();

  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  };

  const numericSize = $derived(
    typeof size === "number"
      ? size
      : sizeMap[size as keyof typeof sizeMap] || 20
  );
</script>

<Loader2Icon
  role="status"
  aria-label="Loading"
  size={numericSize}
  class={cn("animate-spin", className)}
  {...restProps}
/>
