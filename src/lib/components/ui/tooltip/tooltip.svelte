<script lang="ts">
  import { Tooltip as TooltipPrimitive } from "bits-ui";

  interface Props extends Omit<TooltipPrimitive.RootProps, 'open'> {
    open?: boolean;
    delayDuration?: number;
  }

  let { open = $bindable(false), delayDuration = 400, ...restProps }: Props = $props();
</script>

<!-- Self-contained: includes own Provider to prevent context errors -->
<TooltipPrimitive.Provider {delayDuration}>
  <TooltipPrimitive.Root bind:open {...restProps} />
</TooltipPrimitive.Provider>

