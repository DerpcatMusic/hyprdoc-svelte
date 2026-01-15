<script lang="ts">
  import { Dialog as BitsDialog } from "bits-ui";
  import { cn } from "$lib/utils";

  let {
    class: className,
    children,
    ref = $bindable(null),
    ...restProps
  } = $props();
</script>

<BitsDialog.Description
  bind:ref
  class={cn("text-sm text-muted-foreground", className)}
  {...restProps}
>
  {@render children?.()}
</BitsDialog.Description>
