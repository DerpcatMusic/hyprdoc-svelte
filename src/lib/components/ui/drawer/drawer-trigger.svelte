<script lang="ts">
  import { Drawer as Vaul } from "vaul-svelte";

  let { children, ref = $bindable(null), ...restProps } = $props();
</script>

<Vaul.Trigger bind:ref {...restProps}>{@render children?.()}</Vaul.Trigger>
