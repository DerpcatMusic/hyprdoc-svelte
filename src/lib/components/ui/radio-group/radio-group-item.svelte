<script lang="ts">
  import { RadioGroup } from "bits-ui";
  import { cn } from "$lib/utils";

  let {
    class: className,
    value,
    children,
    ref = $bindable(null),
    ...restProps
  }: {
    class?: string;
    value: string;
    children?: any;
    ref?: HTMLElement | null;
  } & Record<string, any> = $props();
</script>

<RadioGroup.Item
  {value}
  class={cn(
		"aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
		className
	)}
  {...restProps}
>
  {#snippet child({ props, checked })}
    <button {...props} type="button">
      {#if checked}
        <div class="flex items-center justify-center">
          <div class="h-2.5 w-2.5 rounded-full bg-current"></div>
        </div>
      {:else}
        {@render children?.()}
      {/if}
    </button>
  {/snippet}
</RadioGroup.Item>
