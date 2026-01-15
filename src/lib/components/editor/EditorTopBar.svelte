<script lang="ts">
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import { Button } from "$lib/components/ui/button";
  import { Spinner } from "$lib/components/ui/spinner";
  import { useEditorBrain } from "$lib/editor/core/EditorBrain.svelte";
  import { cn } from "$lib/utils";
  import CollaboratorAvatars from "./CollaboratorAvatars.svelte";

  interface Props {
    documentId?: Id<"documents">;
    title: string;
    isSaving: boolean;
    lastSavedAt: number | null;
    isSealed: boolean;
    onSave: () => void;
    onSend: () => void;
    onExport?: (type: "pdf" | "hdoc") => void;
    isHdocExporting?: boolean;
  }

  let {
    documentId,
    title = $bindable(),
    isSaving,
    lastSavedAt,
    isSealed,
    onSave,
    onSend,
    onExport,
    isHdocExporting = false,
  }: Props = $props();

  const brain = useEditorBrain();

  const canUndo = $derived(brain.editor?.can().undo() ?? false);
  const canRedo = $derived(brain.editor?.can().redo() ?? false);

  const handleUndo = () => brain.undo();
  const handleRedo = () => brain.redo();

  const modes = [
    { id: "builder", label: "Edit", icon: "i-lucide-pen-tool" },
    { id: "preview", label: "Preview", icon: "i-lucide-eye" },
  ] as const;

  function handleModeChange(modeId: "builder" | "preview") {
    if (brain.mode !== modeId) {
      brain.toggleMode();
    }
  }
</script>

<header
  class="flex h-12 w-full shrink-0 items-center justify-between border-b border-border/40 bg-card px-4 z-50"
>
  <!-- LEFT: Navigation & Context -->
  <div class="flex items-center gap-3">
    <a href="/dashboard" class="p-2 hover:bg-muted rounded-lg transition-colors group" aria-label="Back to dashboard">
      <span class="i-lucide-chevron-left w-4 h-4 text-muted-foreground group-hover:text-foreground"></span>
    </a>
    <div class="mx-1 h-4 w-px bg-border"></div>
    <div class="flex flex-col justify-center">
      <input
        bind:value={title}
        class="h-6 w-48 rounded-sm bg-transparent px-1 font-medium text-sm outline-none hover:bg-muted/50 focus:bg-muted focus:ring-1 focus:ring-ring/20 md:w-64"
        placeholder="Untitled Document"
      >
    </div>
  </div>

  <!-- CENTER: Mode Switcher -->
  <div class="absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
    <div class="flex items-center rounded-md border border-border bg-muted/30 p-1">
      {#each modes as mode}
        <button
          type="button"
          onclick={() => handleModeChange(mode.id)}
          class={cn(
					"flex items-center gap-2 rounded px-3 py-1 font-medium text-xs transition-all",
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
  <div class="flex items-center gap-3">
    {#if documentId}
      <CollaboratorAvatars {documentId} />
    {/if}
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
