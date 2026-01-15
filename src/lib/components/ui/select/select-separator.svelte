<script lang="ts">
  import { Separator as BitsSeparator } from "bits-ui";
  import { cn } from "$lib/utils";

  const { class: className, ...restProps } = $props();
</script>

<BitsSeparator.Root
  class={cn("-mx-1 my-1 h-px bg-muted", className)}
  {...restProps}
/>
