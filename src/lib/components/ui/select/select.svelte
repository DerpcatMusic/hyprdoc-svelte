<script lang="ts">
  import { Select as BitsSelect } from "bits-ui";

  let {
    value = $bindable(""),
    open = $bindable(false),
    onValueChange,
    children,
    ...restProps
  } = $props();
</script>

<BitsSelect.Root type="single" bind:value bind:open {onValueChange} {...restProps}>
  {@render children?.()}
</BitsSelect.Root>
