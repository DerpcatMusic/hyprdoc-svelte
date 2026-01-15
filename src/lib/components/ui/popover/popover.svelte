<script lang="ts">
  import { Popover as BitsPopover } from "bits-ui";

  let { open = $bindable(false), children, ...restProps } = $props();
</script>

<BitsPopover.Root bind:open {...restProps}>
  {@render children?.()}
</BitsPopover.Root>
