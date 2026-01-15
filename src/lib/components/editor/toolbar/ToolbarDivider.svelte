<script lang="ts">
  import { Separator } from "$lib/components/ui/separator";
  import { cn } from "$lib/utils";

  interface Props {
    className?: string;
  }

  let { className }: Props = $props();
</script>

<div
  class={cn("mx-1 h-4 w-px bg-border/40", className)}
  aria-hidden="true"
></div>
