<script lang="ts">
  /**
   * Editor Page - Main Orchestrator
   * Now using EditorBrain for streamlined state.
   */
  import { useConvexClient, useQuery } from "convex-svelte";
  import { FiniteStateMachine, useDebounce } from "runed";
  import { onDestroy, untrack } from "svelte";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import EditorFormattingBar from "$lib/components/editor/EditorFormattingBar.svelte";
  import EditorTopBar from "$lib/components/editor/EditorTopBar.svelte";
  import PropertiesPanel from "$lib/components/editor/properties/PropertiesPanel.svelte";
  import EditorSidebar from "$lib/components/editor/sidebar/EditorSidebar.svelte";
  import SlashMenuPortal from "$lib/components/editor/slash-command/SlashMenuPortal.svelte";
import GlossaryHoverController from "$lib/components/editor/GlossaryHoverController.svelte";

  import { Spinner } from "$lib/components/ui/spinner";
  import { initEditorBrain } from "$lib/editor/core/EditorBrain.svelte";
import { createEditorExtensions } from "$lib/editor/core/extensions";
import { sanitizeSettings } from "@/convex/domains/settings";
import EditorCanvas from "$lib/editor/ui/EditorCanvas.svelte";
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

  // --- 2. Brain Initialization ---
  // Ensure we pass a clean object to the brain
  const brain = initEditorBrain(undefined); // Initialize empty first
  const convexClient = useConvexClient();

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
    })
  );

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

<div class="flex h-screen w-full flex-col overflow-hidden bg-background font-sans text-foreground">
  {#if !isLoading && !error}
    <EditorTopBar
      {documentId}
      bind:title={brain.title}
      isSaving={brain.saveMachine.current === 'saving'}
      lastSavedAt={Date.now()} 
      isSealed={false}
      onSave={performManualSave}
      onSend={() => {}}
      onExport={(type) => {}}
    />

  {:else}
    <header class="z-50 flex h-12 w-full shrink-0 items-center justify-between border-b bg-background px-4">
      <div class="font-bold">{isLoading ? 'Loading...' : 'Untitled Document'}</div>
    </header>
  {/if}

  {#if !isLoading && !error}
    <EditorFormattingBar />
  {/if}

  <div class="relative flex flex-1 overflow-hidden">
    <div class="pointer-events-none absolute left-0 top-0 z-20 h-full">
      <div class="pointer-events-auto h-full">
        <EditorSidebar />
      </div>
    </div>

    <div class="relative flex h-full w-full flex-1 flex-col items-center overflow-hidden bg-muted/5 p-0">
      {#if isLoading}
        <div class="flex h-full items-center justify-center">
          <Spinner size="lg" />
        </div>
      {:else if error}
        <div class="p-4 text-destructive">Error: {error.toString()}</div>
      {:else}
        <EditorCanvas {initialContent} extensions={editorExtensions} />
      {/if}
    </div>

    <div class="pointer-events-none absolute right-0 top-0 z-20 h-full">
      <div class="pointer-events-auto h-full">
        <PropertiesPanel />
      </div>
    </div>
  </div>
</div>

<SlashMenuPortal />
<GlossaryHoverController />
