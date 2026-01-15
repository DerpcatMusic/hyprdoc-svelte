<script lang="ts">
  import { Select as BitsSelect } from "bits-ui";

  let { value, ref = $bindable(null), ...restProps } = $props();
</script>

<input type="hidden" bind:this={ref} {value} {...restProps}>
