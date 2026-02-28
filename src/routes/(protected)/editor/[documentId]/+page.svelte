<script lang="ts">
  /**
   * Editor Page - Main Orchestrator
   * Now using EditorBrain for streamlined state.
   */
  import { useConvexClient, useQuery } from "convex-svelte";
  import { onDestroy } from "svelte";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import { page } from "$app/state";
  import EditorFormattingBar from "$lib/components/editor/EditorFormattingBar.svelte";
  import EditorTopBar from "$lib/components/editor/EditorTopBar.svelte";
  import PropertiesPanel from "$lib/components/editor/properties/PropertiesPanel.svelte";
  import EditorSidebar from "$lib/components/editor/sidebar/EditorSidebar.svelte";
  import SlashMenuPortal from "$lib/components/editor/slash-command/SlashMenuPortal.svelte";
  import GlossaryHoverController from "$lib/components/editor/GlossaryHoverController.svelte";
  import { SendForSigningModal } from "$lib/components/editor/signing";

  import { Spinner } from "$lib/components/ui/spinner";
  import { initEditorBrain } from "$lib/editor/core/EditorBrain.svelte";
  import { createEditorExtensions } from "$lib/editor/core/extensions";
  import { useTrackChanges } from "$lib/editor/core/useTrackChanges.svelte";
  import EditorCanvas from "$lib/editor/ui/EditorCanvas.svelte";
  import { TRACK_CHANGE_COLORS } from "$lib/styles/ui-palette";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // --- 1. ID & Query ---
  const documentId = $derived(page.params.documentId as Id<"documents">);

  // Client-side document fetch via WebSocket (fast, no SSR delay)
  const documentQuery = useQuery(
    api.documents.queries.get.get,
    () => ({ documentId })
  );

  const documentData = $derived(documentQuery.data);
  const isLoading = $derived(documentQuery.isLoading);
  const error = $derived(documentQuery.error);

  // --- 1.5 Glossary Terms ---
  const glossaryTermsQuery = useQuery(api.glossary.queries.listTermsIndex, {});
  const glossaryTerms = $derived(glossaryTermsQuery.data ?? []);

  // --- 1.6 Global Variables (for Tab-to-Variable autocomplete) ---
  const variablesQuery = useQuery(
    api.globalVariables.queries.listForDocument,
    () => ({ documentId })
  );
  const globalVariables = $derived(variablesQuery.data ?? []);

  // --- 2. Brain Initialization ---
  // Ensure we pass a clean object to the brain
  const brain = initEditorBrain(undefined); // Initialize empty first
  
  // Signing modal state
  let showSigningModal = $state(false);
  const convexClient = useConvexClient();

  // Note: BlockRegistry is a module-level singleton that auto-initializes

  $effect(() => {
    // Set doc when client-side query returns data
    if (documentData) {
      brain.setDoc(documentData);
    }
  });

  // --- 3. Extensions ---
  const editorExtensions = $derived(
    createEditorExtensions({
      placeholder: 'Start typing or press "/" for commands...',
      currentUserId: data?.workosId ?? "",
      variables: globalVariables,
    })
  );

  // --- 3.5 Track Changes Hook ---
  const trackChanges = useTrackChanges(() => ({
    documentId,
    authorName: data?.userName ?? "User",
    authorColor: TRACK_CHANGE_COLORS.author,
  }));

  const toggleSuggestMode = () => {
    brain.editor?.commands.toggleSuggestMode();
  };

  // --- 4. Setup Brain ---
  
  $effect(() => {
    if (documentId && convexClient) {
      brain.setupPersistence(convexClient, documentId);
    }
  });

  // Keep Glossary Extension terms in sync
  $effect(() => {
    if (glossaryTerms.length > 0) {
      brain.syncGlossary(glossaryTerms);
    }
  });

  // Manual save trigger for the UI button
  async function performManualSave() {
    brain.handleStateChange();
    await brain.performSave();
  }


  // --- 5. Content ---
  const initialContent = $derived.by(() => {
    if (!documentData?.content) return undefined;
    try {
      const parsed = JSON.parse(documentData.content);
      return parsed?.type ? parsed : { type: "doc", content: [] };
    } catch {
      return { type: "doc", content: [] };
    }
  });

  onDestroy(() => brain.destroy());
</script>

<div class="relative flex h-screen w-full flex-col overflow-hidden bg-background font-sans text-foreground">
  <div class="pointer-events-none absolute inset-0 z-0">
    <div class="absolute -top-24 left-1/3 h-72 w-72 rounded-full bg-primary/6 blur-3xl"></div>
    <div class="absolute bottom-10 right-1/4 h-64 w-64 rounded-full bg-secondary/10 blur-3xl"></div>
    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-muted/10 to-transparent"></div>
  </div>

  {#if !isLoading && !error}
    <EditorTopBar
      {documentId}
      documentKind={documentData?.kind}
      bind:title={brain.title}
      isSaving={brain.saveMachine.current === 'saving'}
      lastSavedAt={documentData?.updatedAt ?? null}
      isSealed={false}
      onSave={performManualSave}
      onSend={() => showSigningModal = true}
      onExport={(type) => {}}
      suggestModeEnabled={trackChanges.suggestModeEnabled}
      pendingChangesCount={trackChanges.pendingCount}
      onToggleSuggestMode={toggleSuggestMode}
      onAcceptAll={async () => { await trackChanges.acceptAll(); }}
      onRejectAll={async () => { await trackChanges.rejectAll(); }}
    />

  {:else}
    <header class="z-50 flex h-12 w-full shrink-0 items-center justify-between border-b bg-background px-4">
      <div class="font-bold">{isLoading ? 'Loading...' : 'Untitled Document'}</div>
    </header>
  {/if}

  {#if !isLoading && !error && !brain.isPreview}
    <EditorFormattingBar />
  {/if}

  <div class="relative z-10 flex flex-1 overflow-hidden">
    {#if !brain.isPreview}
      <div class="pointer-events-none absolute inset-y-0 left-0 z-20">
        <div class="pointer-events-auto h-full">
          <EditorSidebar />
        </div>
      </div>
    {/if}

    <div class="relative flex h-full w-full flex-1 flex-col items-center overflow-hidden px-2 pb-2 md:px-3">
      {#if isLoading}
        <div class="flex h-full items-center justify-center">
          <Spinner size="lg" />
        </div>
      {:else if error}
        <div class="p-4 text-destructive">Error: {error.toString()}</div>
      {:else}
        <div class="relative h-full w-full overflow-hidden rounded-xl border border-border/60 bg-background/80 shadow-2xl backdrop-blur-sm">
          <EditorCanvas {initialContent} extensions={editorExtensions} />
        </div>
      {/if}
    </div>

    {#if !brain.isPreview}
      <div class="pointer-events-none absolute inset-y-0 right-0 z-20">
        <div class="pointer-events-auto h-full">
          <PropertiesPanel />
        </div>
      </div>
    {/if}
  </div>
</div>

<SlashMenuPortal />
<GlossaryHoverController />

{#if documentData}
  <SendForSigningModal
    {documentId}
    documentTitle={brain.title}
    documentKind={documentData.kind}
    bind:open={showSigningModal}
  />
{/if}
