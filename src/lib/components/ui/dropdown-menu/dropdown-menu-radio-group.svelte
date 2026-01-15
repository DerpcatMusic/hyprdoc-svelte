<script lang="ts">
  import { DropdownMenu as BitsDropdownMenu } from "bits-ui";

  let { value = $bindable(""), children, ...restProps } = $props();
</script>

<BitsDropdownMenu.RadioGroup bind:value {...restProps}>
  {@render children?.()}
</BitsDropdownMenu.RadioGroup>
