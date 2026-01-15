<script lang="ts">
  import InvasiveSeo from "$lib/components/seo/InvasiveSeo.svelte";
  const { children } = $props();
</script>

<InvasiveSeo />

<div class="marketing-root">
  {@render children()}
</div>
