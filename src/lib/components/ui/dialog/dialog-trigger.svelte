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

<BitsDialog.Trigger bind:ref class={cn(className)} {...restProps}>
  {@render children?.()}
</BitsDialog.Trigger>
