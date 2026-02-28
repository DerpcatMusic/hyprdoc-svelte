<script lang="ts">
  /**
   * BlockView - Mode-aware block renderer
   *
   * Premium design matching Next.js SmartBlock:
   * - Color stripe on left showing party color
   * - Sticker badges for REQ/Unassigned
   * - Draggable header with label + controls
   * - Clean consumer view with minimal UI
   */

  import type { Component } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { useDebounce } from "runed";
  import { NodeViewWrapper } from "svelte-tiptap";
  import { blockRegistry } from "$lib/blocks/registry";
  import { editorState } from "$lib/editor/core/editor-state.svelte";
  import { partyStore } from "$lib/editor/core/party-store.svelte";
  import type { BaseBlockAttrs } from "$lib/blocks/types";
  import type { Node } from "@tiptap/pm/model";
  import { cn } from "$lib/utils";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { uiStore } from "$lib/stores/ui-store.svelte";
  import { Plus, UserMinus, Settings } from "lucide-svelte";

  // Props passed by SvelteNodeViewRenderer
  interface NodeViewComponentProps {
    node: Node;
    updateAttributes: (attrs: Record<string, unknown>) => void;
    selected: boolean;
    editor: unknown;
    getPos: () => number;
    deleteNode: () => void;
  }

  const { node, updateAttributes, selected, deleteNode, editor }: NodeViewComponentProps = $props();

  // ════════════════════════════════════════════════════════════════════════════
  // DERIVED STATE
  // ════════════════════════════════════════════════════════════════════════════

  const attrs = $derived(node.attrs as BaseBlockAttrs);
  const blockType = $derived(attrs.blockType);
  const definition = $derived(blockRegistry.get(blockType));
  
  // Use editorState.mode for reactivity, fallback to editor.isEditable
  const isEditing = $derived(
    editorState.mode === "edit" && (editor as any)?.isEditable !== false
  );
  const mode = $derived(isEditing ? "edit" : "sign");
  const partyColor = $derived(partyStore.getColor(attrs.partyId));
  const partyName = $derived(partyStore.getName(attrs.partyId));
  const isUnassigned = $derived(!attrs.partyId);

  // Use definition name or block type if label is missing
  const displayLabel = $derived(attrs.data?.label || definition?.name || blockType);

  let isHovered = $state(false);
  let isRenaming = $state(false);
  let renameValue = $state("");
  let pendingData = $state<Record<string, unknown>>({});

  // Sync renameValue with attrs.data.label once on mount or when label changes
  $effect(() => {
    renameValue = attrs.data?.label as string ?? "Field";
  });

  $effect(() => {
    pendingData = { ...((attrs.data ?? {}) as Record<string, unknown>) };
  });

  const flushDataUpdate = useDebounce((nextData: Record<string, unknown>) => {
    // Validate block payload against the block schema before writing.
    const parseResult = definition?.dataSchema?.safeParse(nextData);
    if (parseResult && !parseResult.success) return;
    updateAttributes({ data: nextData });
  }, 300);

  // ════════════════════════════════════════════════════════════════════════════
  // DYNAMIC COMPONENT LOADING
  // ════════════════════════════════════════════════════════════════════════════

  const loadedComponents = new SvelteMap<string, { component: Component<any> | null; error: string | null }>();
  
  const currentComponent = $derived.by(() => {
    const type = blockType;
    const def = definition;
    
    const cached = loadedComponents.get(type);
    if (cached) return cached;
    
    if (def?.component) {
      queueMicrotask(() => {
        def.component()
          .then((mod: { default: Component<any> }) => {
            loadedComponents.set(type, { component: mod.default, error: null });
          })
          .catch((err: Error) => {
            loadedComponents.set(type, { component: null, error: err.message || "Failed to load" });
          });
      });
    }
    
    return { component: null, error: def ? null : `Unknown block type: ${type}` };
  });

  const BlockComponent = $derived(currentComponent.component);
  const loadError = $derived(currentComponent.error);

  // ════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  function updateData(updates: Record<string, unknown>): void {
    pendingData = { ...pendingData, ...updates };
    flushDataUpdate(pendingData);
  }

  function toggleRequired(): void {
    updateAttributes({ required: !attrs.required });
  }

  function handleRename(): void {
    if (renameValue.trim()) {
      updateData({ label: renameValue.trim() });
    }
    isRenaming = false;
  }

  function handleAssign(partyId: string | null): void {
    updateAttributes({ partyId });
  }

  function handleAddParty(): void {
    const newParty = partyStore.addParty();
    handleAssign(newParty.id);
  }

  function handleManageParties(): void {
    uiStore.setPropertiesTab("parties");
  }

  function handleDelete(): void {
    deleteNode();
  }

  function handleDragStart(e: DragEvent): void {
    e.dataTransfer?.setData("application/x-hyprdoc-block-id", attrs.id);
    e.dataTransfer!.effectAllowed = "move";
  }
</script>

<NodeViewWrapper
  as="div"
  class={cn(
    "hyprdoc-block group relative my-4 transition-all duration-300 isolate",
    isEditing && "cursor-default"
  )}
  data-block-type={blockType}
  contenteditable="false"
  onmouseenter={() => isHovered = true}
  onmouseleave={() => isHovered = false}
>
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- EDIT MODE: Builder View -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  {#if isEditing}
    <!-- Background Layer (Consolidated Borders) -->
    <div 
      class={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-lg transition-all duration-300",
        selected ? "bg-muted/30 shadow-sm" : "bg-transparent"
      )}
      style="
        box-shadow: {selected ? `inset 0 0 0 2px ${partyColor}` : isHovered ? `inset 0 0 0 1px ${partyColor}40` : 'none'};
      "
    >
      <!-- Party Color Stripe (The only true 'border' visual) -->
      <div
        class={cn(
          "absolute top-0 bottom-0 left-0 z-10 transition-all duration-300",
          isHovered || selected ? "w-[6px]" : "w-[4px]",
        )}
        style="background-color: {partyColor}"
      ></div>
      
      <!-- Hover Tint -->
      {#if isHovered && !selected}
        <div
          class="absolute inset-0 z-0 opacity-10 transition-opacity"
          style="background-color: {partyColor}"
        ></div>
      {/if}
    </div>

    <!-- Sticker Badges (Top Edge) -->
    <div class="absolute -top-2.5 left-4 z-50 flex items-center gap-2">
      <!-- Unassigned Badge -->
      {#if isUnassigned}
        <div class="flex -rotate-2 items-center gap-1.5 rounded-sm border border-border bg-background px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground shadow-sm transition-transform hover:rotate-0">
          <span class="i-lucide-alert-triangle size-2.5"></span>
          <span>Unassigned</span>
        </div>
      {/if}

      <!-- Required Badge -->
      {#if attrs.required}
        <div class="flex rotate-2 items-center gap-1.5 rounded-sm border border-destructive bg-destructive px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-destructive-foreground shadow-sm transition-transform hover:rotate-0">
          REQ
        </div>
      {/if}
    </div>

    <!-- Delete Button (Top Right) -->
    <div
      class={cn(
        "absolute -top-3 -right-2 z-50 transition-all duration-200",
        isHovered || selected
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      )}
    >
      <button
        type="button"
        onclick={(e: MouseEvent) => { e.stopPropagation(); handleDelete(); }}
        class="flex items-center justify-center rounded-full border border-border bg-background p-2 text-muted-foreground shadow-md transition-all hover:border-destructive hover:bg-destructive hover:text-destructive-foreground rotate-12"
        title="Delete block"
        aria-label="Delete block"
      >
        <span class="i-lucide-trash-2 size-4"></span>
      </button>
    </div>

    <!-- Content Container -->
    <div class="relative z-10 overflow-hidden rounded-lg p-2">
      <!-- Header (Draggable) -->
      <div
        class="relative z-20 flex select-none items-center justify-between rounded-sm py-1 transition-all duration-300 mb-2"
        draggable="true"
        ondragstart={handleDragStart}
        role="presentation"
      >
        <!-- Left: Drag Handle + Label -->
        <div class="group/handle flex cursor-grab items-center gap-2 active:cursor-grabbing">
          <div
            class={cn(
              "rounded-sm p-1 transition-colors",
              isHovered || selected
                ? "text-foreground opacity-100"
                : "text-muted-foreground/40 opacity-50 group-hover/handle:opacity-100"
            )}
          >
            <span class="i-lucide-grip-vertical size-3.5"></span>
          </div>

          {#if isRenaming}
            <input
              class="h-5 min-w-[120px] rounded-sm bg-muted/50 px-1 text-xs font-bold uppercase tracking-widest text-foreground outline-none focus:ring-1 focus:ring-primary/20"
              bind:value={renameValue}
              onblur={handleRename}
              onkeydown={(e: KeyboardEvent) => e.key === "Enter" && handleRename()}
              onclick={(e: MouseEvent) => e.stopPropagation()}
            />
          {:else}
            <span
              class={cn(
                "block max-w-[200px] truncate text-xs font-bold uppercase tracking-widest transition-colors cursor-text",
                isHovered || selected ? "text-foreground" : "text-muted-foreground"
              )}
              role="button"
              tabindex="0"
              ondblclick={() => isRenaming = true}
              onkeydown={(e: KeyboardEvent) => e.key === "Enter" && (isRenaming = true)}
              title="Double click to rename"
            >
              {displayLabel}
            </span>
          {/if}
        </div>

        <!-- Right: Controls -->
        <div
          class={cn(
            "flex items-center gap-2 transition-all duration-200",
            isHovered || selected
              ? "translate-x-0 opacity-100"
              : "pointer-events-none translate-x-2 opacity-0"
          )}
        >
          <!-- Required Toggle -->
          <button
            type="button"
            onclick={(e: MouseEvent) => { e.stopPropagation(); toggleRequired(); }}
            class={cn(
              "group flex h-6 min-w-12 items-center justify-center gap-1.5 rounded-sm border px-1.5 transition-all active:scale-95",
              attrs.required
                ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            title="Toggle Required"
          >
            <div
              class={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                attrs.required
                  ? "bg-destructive"
                  : "bg-muted-foreground/40 group-hover:bg-muted-foreground"
              )}
            ></div>
            <span class="text-[9px] font-bold uppercase tracking-widest">
              {attrs.required ? "Req" : "Opt"}
            </span>
          </button>

          <!-- Party Assign Dropdown -->
          <DropdownMenu.Root>
            <DropdownMenu.Trigger 
              class="flex h-6 items-center gap-2 rounded-sm border border-border/50 bg-background/50 px-2 text-[10px] font-mono uppercase text-foreground hover:bg-background transition-colors active:scale-95"
            >
              <div
                class="h-2 w-2 rounded-full ring-1 ring-inset ring-black/10"
                style="background-color: {partyColor}"
              ></div>
              <span class="max-w-[80px] truncate">{partyName ?? "Assign"}</span>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="z-[100] min-w-[180px]" align="end">
              <DropdownMenu.Group>
                <DropdownMenu.Label class="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  Assign to Party
                </DropdownMenu.Label>
                <DropdownMenu.Separator class="" />
                
                {#each partyStore.parties as party (party.id)}
                  <DropdownMenu.Item 
                    onclick={() => handleAssign(party.id)}
                    class="flex items-center gap-2"
                  >
                    <div class="size-2 rounded-full" style="background-color: {party.color}"></div>
                    <span class="flex-1 truncate">{party.name}</span>
                    {#if attrs.partyId === party.id}
                      <span class="i-lucide-check size-3 text-primary"></span>
                    {/if}
                  </DropdownMenu.Item>
                {/each}
              </DropdownMenu.Group>

              <DropdownMenu.Group>
                {#if partyStore.parties.length > 0}
                  <DropdownMenu.Separator class="" />
                {/if}

                <DropdownMenu.Item onclick={handleAddParty} class="text-primary font-medium">
                  <Plus class="size-3.5 mr-2" />
                  Add New Party
                </DropdownMenu.Item>

                <DropdownMenu.Item onclick={() => handleAssign(null)} class="text-muted-foreground">
                  <UserMinus class="size-3.5 mr-2" />
                  Unassign
                </DropdownMenu.Item>
              </DropdownMenu.Group>

              <DropdownMenu.Separator class="" />
              
              <DropdownMenu.Group>
                <DropdownMenu.Item onclick={handleManageParties} class="">
                  <Settings class="size-3.5 mr-2" />
                  Manage All Parties
                </DropdownMenu.Item>
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>

      <!-- Block Content -->
      <div class="relative pl-1">
        {#if loadError}
          <div class="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            <span class="i-lucide-alert-triangle size-4"></span>
            <span>{loadError}</span>
          </div>
        {:else if BlockComponent}
          {@const BC = BlockComponent}
          <BC
            {mode}
            {attrs}
            data={attrs.data}
            {updateData}
            updateAttrs={updateAttributes}
            {selected}
          />
        {:else}
          <div class="flex items-center justify-center gap-2 py-4 text-muted-foreground">
            <span class="i-lucide-loader-2 size-4 animate-spin"></span>
            <span class="text-sm">Loading...</span>
          </div>
        {/if}
      </div>
    </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- PREVIEW MODE: Consumer View -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  {:else}
    <div class="relative pl-4 transition-all duration-300">
      <!-- Background Layer -->
      <div class="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-md transition-colors duration-300">
        <!-- Party Color Stripe -->
        {#if !isUnassigned}
          <div
            class="absolute top-0 bottom-0 left-0 w-[4px] transition-all duration-500"
            style="background-color: {partyColor}"
          ></div>
          
          <!-- Hover Effect -->
          <div
            class={cn(
              "pointer-events-none absolute inset-0 rounded-md border transition-all duration-300",
              isHovered
                ? "border-primary/10 opacity-100"
                : "border-transparent opacity-0"
            )}
            style="background-color: {isHovered ? `${partyColor}08` : 'transparent'}"
          ></div>
        {/if}
      </div>

      <!-- Content -->
      <div class="relative z-10 px-4 py-3 transition-all duration-300">
        <div class="mb-2.5 flex items-center justify-between px-0.5">
          <span class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/80 transition-colors">
            {displayLabel}
          </span>

          {#if attrs.required}
            <span class="flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-medium text-destructive">
              Required
            </span>
          {/if}
        </div>

        <!-- Block Content -->
        <div class="relative">
          {#if BlockComponent}
            {@const BC = BlockComponent}
            <BC
              {mode}
              {attrs}
              data={attrs.data}
              {updateData}
              updateAttrs={updateAttributes}
              {selected}
            />
          {:else}
            <div class="py-2 text-sm text-muted-foreground">Loading...</div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</NodeViewWrapper>

<style>
  /* Ensure block doesn't get text cursor or selection styling */
  :global(.hyprdoc-block) {
    user-select: none;
  }
  
  :global(.hyprdoc-block *) {
    user-select: auto;
  }
</style>
