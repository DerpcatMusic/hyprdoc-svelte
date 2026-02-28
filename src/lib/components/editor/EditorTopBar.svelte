<script lang="ts">
  import type { Id } from "@/convex/_generated/dataModel";
  import { Button } from "$lib/components/ui/button";
  import { Spinner } from "$lib/components/ui/spinner";
  import { useEditorBrain } from "$lib/editor/core/EditorBrain.svelte";
  import { EDITOR_TOPBAR_LAYOUT } from "$lib/styles/editor-layout";
  import { cn } from "$lib/utils";
  import CollaboratorAvatars from "./CollaboratorAvatars.svelte";
  import TrackChangesToolbar from "./toolbar/TrackChangesToolbar.svelte";

  interface Props {
    documentId?: Id<"documents">;
    documentKind?: "template" | "envelope";
    title: string;
    isSaving: boolean;
    lastSavedAt: number | null;
    isSealed: boolean;
    onSave: () => void;
    onSend: () => void;
    onExport?: (type: "pdf" | "hdoc") => void;
    isHdocExporting?: boolean;
    // Track Changes
    suggestModeEnabled?: boolean;
    pendingChangesCount?: number;
    onToggleSuggestMode?: () => void;
    onAcceptAll?: () => Promise<void>;
    onRejectAll?: () => Promise<void>;
  }

  let {
    documentId,
    documentKind = "template",
    title = $bindable(),
    isSaving,
    lastSavedAt,
    isSealed,
    onSave,
    onSend,
    onExport,
    isHdocExporting = false,
    // Track Changes
    suggestModeEnabled = false,
    pendingChangesCount = 0,
    onToggleSuggestMode,
    onAcceptAll,
    onRejectAll,
  }: Props = $props();

  const brain = useEditorBrain();

  const handleUndo = () => brain.undo();
  const handleRedo = () => brain.redo();

  const modes = [
    { id: "edit", label: "Edit", icon: "i-lucide-pen-tool" },
    { id: "sign", label: "Preview", icon: "i-lucide-eye" },
  ] as const;

  function handleModeChange(modeId: "edit" | "sign") {
    if (brain.mode === modeId) return;
    
    if (modeId === "sign") {
      // Enter preview mode (snapshot content for restore on exit)
      brain.enterPreview();
    } else {
      // Exit preview mode (restore content to discard changes)
      brain.exitPreview();
    }
  }

  const lastSavedLabel = $derived.by(() => {
    if (isSaving) return "Saving...";
    if (!lastSavedAt) return "Not saved yet";

    const date = new Date(lastSavedAt);
    if (Number.isNaN(date.getTime())) return "Saved";
    return `Saved ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  });
</script>

<header
  class={EDITOR_TOPBAR_LAYOUT.shell}
>
  <!-- LEFT: Navigation & Context -->
  <div class={EDITOR_TOPBAR_LAYOUT.leftZone}>
    <a href="/dashboard" class={EDITOR_TOPBAR_LAYOUT.iconButton} aria-label="Back to dashboard">
      <span class="i-lucide-chevron-left w-4 h-4 text-muted-foreground group-hover:text-foreground"></span>
    </a>
    <div class="mx-1 h-4 w-px bg-border"></div>
    <span class={EDITOR_TOPBAR_LAYOUT.kindPill}>
      {documentKind}
    </span>
    <div class="flex min-w-0 flex-col justify-center">
      <input
        bind:value={title}
        class={EDITOR_TOPBAR_LAYOUT.titleInput}
        placeholder="Untitled Document"
      >
    </div>
  </div>

  <!-- CENTER: Mode Switcher -->
  <div class={EDITOR_TOPBAR_LAYOUT.centerZone}>
    <div class={EDITOR_TOPBAR_LAYOUT.modeSwitchShell}>
      {#each modes as mode}
        <button
          type="button"
          onclick={() => handleModeChange(mode.id)}
          class={cn(
            EDITOR_TOPBAR_LAYOUT.modeButton,
            mode.id === brain.mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span class={cn(mode.icon, "w-3 h-3")}></span>
          {mode.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- RIGHT: Actions -->
  <div class={EDITOR_TOPBAR_LAYOUT.rightZone}>
    <!-- Track Changes Toolbar -->
    {#if onToggleSuggestMode}
      <TrackChangesToolbar
        {suggestModeEnabled}
        pendingCount={pendingChangesCount}
        onToggleSuggestMode={onToggleSuggestMode}
        onAcceptAll={onAcceptAll ?? (async () => {})}
        onRejectAll={onRejectAll ?? (async () => {})}
      />
      <div class="h-6 w-px bg-border/70"></div>
    {/if}

    <span class={EDITOR_TOPBAR_LAYOUT.statusPill}>
      {lastSavedLabel}
    </span>
    
    {#if documentId}
      <CollaboratorAvatars {documentId} />
    {/if}
    
    <!-- Send for Signing Button -->
    <Button
      onclick={onSend}
      variant="outline"
      size="sm"
      class="h-8 gap-2"
    >
      <span class="i-lucide-send w-3.5 h-3.5"></span>
      <span>Send</span>
    </Button>
    
    <Button
      onclick={onSave}
      size="sm"
      class="h-8 gap-2 bg-foreground text-background hover:bg-foreground/90"
    >
      <Spinner size="xs" class={isSaving ? "block" : "hidden"} />
      <span>Save</span>
    </Button>
  </div>
</header>
