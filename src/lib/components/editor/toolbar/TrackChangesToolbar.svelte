<script lang="ts">
  /**
   * TrackChangesToolbar - Accept/Reject Controls
   * ════════════════════════════════════════════════════════════════════════════
   * Toolbar buttons for track changes: enable suggest mode, accept/reject changes.
   */
  import { Check, X, Loader2, PenLine, Eye } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils";
  import type { Id } from "@/convex/_generated/dataModel";

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PROPS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  interface Props {
    suggestModeEnabled: boolean;
    pendingCount: number;
    isLoading?: boolean;
    onToggleSuggestMode: () => void;
    onAcceptAll: () => Promise<void>;
    onRejectAll: () => Promise<void>;
  }

  let {
    suggestModeEnabled,
    pendingCount,
    isLoading = false,
    onToggleSuggestMode,
    onAcceptAll,
    onRejectAll,
  }: Props = $props();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let isAccepting = $state(false);
  let isRejecting = $state(false);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HANDLERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async function handleAcceptAll() {
    if (isAccepting || pendingCount === 0) return;
    isAccepting = true;
    try {
      await onAcceptAll();
    } finally {
      isAccepting = false;
    }
  }

  async function handleRejectAll() {
    if (isRejecting || pendingCount === 0) return;
    isRejecting = true;
    try {
      await onRejectAll();
    } finally {
      isRejecting = false;
    }
  }
</script>

<div class="flex items-center gap-1">
  <!-- Suggest Mode Toggle -->
  <Button
    size="sm"
    variant={suggestModeEnabled ? "default" : "outline"}
    class={cn(
      "h-7 text-xs gap-1.5 transition-all",
      suggestModeEnabled && "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
    )}
    onclick={onToggleSuggestMode}
    disabled={isLoading}
  >
    {#if suggestModeEnabled}
      <PenLine class="size-3.5" />
      Suggesting
    {:else}
      <Eye class="size-3.5" />
      Track Changes
    {/if}
  </Button>

  <!-- Pending Count Badge -->
  {#if pendingCount > 0}
    <span class="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-500/20 text-amber-600 text-[10px] font-bold">
      {pendingCount}
    </span>
  {/if}

  <!-- Separator -->
  {#if pendingCount > 0}
    <div class="h-4 w-px bg-border mx-1"></div>

    <!-- Accept All -->
    <Button
      size="sm"
      variant="ghost"
      class="h-7 text-xs gap-1 text-green-600 hover:bg-green-50 hover:text-green-700"
      onclick={handleAcceptAll}
      disabled={isAccepting || pendingCount === 0}
    >
      {#if isAccepting}
        <Loader2 class="size-3.5 animate-spin" />
      {:else}
        <Check class="size-3.5" />
      {/if}
      Accept All
    </Button>

    <!-- Reject All -->
    <Button
      size="sm"
      variant="ghost"
      class="h-7 text-xs gap-1 text-destructive hover:bg-red-50"
      onclick={handleRejectAll}
      disabled={isRejecting || pendingCount === 0}
    >
      {#if isRejecting}
        <Loader2 class="size-3.5 animate-spin" />
      {:else}
        <X class="size-3.5" />
      {/if}
      Reject All
    </Button>
  {/if}
</div>
