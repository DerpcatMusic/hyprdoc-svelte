<script lang="ts">
  import { Drawer as Vaul } from "vaul-svelte";
  import { cn } from "$lib/utils";
  import DrawerOverlay from "./drawer-overlay.svelte";

  let {
    class: className,
    children,
    ref = $bindable(null),
    ...restProps
  }: {
    class?: string;
    children?: import("svelte").Snippet;
    ref?: HTMLElement | null;
  } & Record<string, any> = $props();
</script>

<Vaul.Portal>
  <DrawerOverlay />
  <Vaul.Content
    class={cn(
			"fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
			className
		)}
    {...restProps}
  >
    {#snippet child({ props, action }: { props: Record<string, any>; action: any })}
      <div {...props} use:action bind:this={ref}>
        <div class="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted"></div>
        {@render children?.()}
      </div>
    {/snippet}
  </Vaul.Content>
</Vaul.Portal>
