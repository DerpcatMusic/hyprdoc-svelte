<script lang="ts">
  /**
   * GlossaryPanel - Redesigned with ULTRATHINK Protocol
   * - Avant-Garde UI Styling
   * - High-Performance Debounced Search
   * - Refined Entry Cards
   */
  import { Debounced } from "runed";
  import { useConvexClient, useQuery } from "convex-svelte";
  import {
    Book,
    Check,
    Loader2,
    Plus,
    Search,
    Trash2,
    X,
    Hash,
    Shapes,
    Sparkles,
    BookOpen
  } from "lucide-svelte";
  import { slide, fade } from "svelte/transition";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { cn } from "$lib/utils";
  import { Label } from "$lib/components/ui/label";
  import { EDITOR_PANEL_LAYOUT } from "$lib/styles/editor-layout";

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TYPES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  interface TermData {
    _id: Id<"glossaryTerms">;
    term: string;
    termLower?: string;
    definition: string;
    category?: string;
    source?: string;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const convex = useConvexClient();

  // Search with RUNED debounce
  let searchValue = $state("");
  const debouncedSearch = new Debounced(() => searchValue, 150);
  const searchQuery = $derived(debouncedSearch.current);

  // UI state
  let isAddingMode = $state(false);
  let editingId = $state<string | null>(null);

  // Form state
  let formData = $state({
    term: "",
    definition: "",
    category: "General",
  });

  // Inline edit state
  let inlineEditId = $state<string | null>(null);
  let inlineEditDef = $state("");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUERIES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const termsQuery = useQuery(api.glossary.queries.search, () => ({ query: searchQuery }));
  const terms = $derived(termsQuery.data as TermData[] | undefined);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HANDLERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function resetForm() {
    formData = { term: "", definition: "", category: "General" };
    isAddingMode = false;
    editingId = null;
  }

  function handleEditClick(t: TermData) {
    editingId = t._id;
    formData = {
      term: t.term,
      definition: t.definition,
      category: t.category || "General",
    };
    isAddingMode = true;
  }

  async function handleSave() {
    if (!formData.term || !formData.definition) return;

    try {
      if (editingId) {
        await convex.mutation(api.glossary.mutations.updateTerm, {
          id: editingId as Id<"glossaryTerms">,
          term: formData.term,
          definition: formData.definition,
        });
      } else {
        await convex.mutation(api.glossary.mutations.addTerm, {
          term: formData.term,
          definition: formData.definition,
          category: formData.category,
        });
      }
      resetForm();
    } catch (error) {
      console.error("Failed to save term", error);
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    try {
      await convex.mutation(api.glossary.mutations.deleteTerm, {
        id: editingId as Id<"glossaryTerms">,
      });
      resetForm();
    } catch (error) {
      console.error("Failed to delete", error);
    }
  }

  // Grouped by category
  const groupedTerms = $derived.by(() => {
    if (!terms) return {};
    const groups: Record<string, TermData[]> = {};
    for (const t of terms) {
      const cat = t.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return groups;
  });
</script>

<div class="flex h-full w-full flex-col bg-card overflow-hidden">
  <div class={EDITOR_PANEL_LAYOUT.header}>
    <div class="flex items-center justify-between mb-4">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Knowledge Layer</p>
        <h2 class="text-sm font-bold text-foreground">Glossary</h2>
      </div>
      <Button
        size="sm"
        variant={isAddingMode ? "secondary" : "default"}
        class="h-8 w-8 rounded-md"
        onclick={() => (isAddingMode ? resetForm() : (isAddingMode = true))}
      >
        <Plus class={cn("size-4 transition-transform", isAddingMode && "rotate-45")} />
      </Button>
    </div>

    <!-- Search -->
    <div class="relative">
      <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
      <Input
        bind:value={searchValue}
        placeholder="Search glossary..."
        class="h-8 rounded-md border-border/60 bg-background pl-8 text-xs"
      />
    </div>
  </div>

  {#if isAddingMode}
    <div transition:slide={{ duration: 200 }} class="border-b border-border/40 bg-muted/20 p-4 space-y-3">
      <div class="flex items-center justify-between">
        <Label class="text-[10px] uppercase font-bold text-muted-foreground">{editingId ? "Edit Term" : "New Term"}</Label>
        {#if editingId}
          <Button
            variant="ghost"
            size="sm"
            class="h-6 px-2 text-destructive hover:bg-destructive/10 text-[10px] font-bold uppercase"
            onclick={handleDelete}
          >
            <Trash2 class="size-3 mr-1" /> Delete
          </Button>
        {/if}
      </div>

      <Input
        bind:value={formData.term}
        placeholder="Term (e.g. 'Force Majeure')"
        class="h-9 bg-background border-border/60 rounded-md text-sm font-bold"
      />

      <textarea
          bind:value={formData.definition}
          placeholder="Enter definition..."
          class="flex min-h-[80px] w-full rounded-md border border-border/60 bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
          onkeydown={(e: KeyboardEvent) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSave();
          }}
      ></textarea>

      <div class="flex gap-2 pt-1">
        <Button size="sm" class="flex-1 h-8 rounded-md text-[11px] font-bold" onclick={handleSave} disabled={!formData.term || !formData.definition}>
          {editingId ? "Update" : "Create"}
        </Button>
        <Button size="sm" variant="outline" class="h-8 px-3 rounded-md text-[11px] font-bold" onclick={resetForm}>
          Cancel
        </Button>
      </div>
    </div>
  {/if}

  <div class={EDITOR_PANEL_LAYOUT.bodyScroll}>
    <div class={EDITOR_PANEL_LAYOUT.bodyPadded + " space-y-6"}>
      {#if termsQuery.isLoading && !terms}
        <div class="flex items-center justify-center p-12">
          <Loader2 class="size-5 animate-spin text-muted-foreground/40" />
        </div>
      {:else if !terms || terms.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center">
           <p class="text-[11px] font-medium text-muted-foreground">No terms defined.</p>
        </div>
      {:else}
        {#each Object.entries(groupedTerms) as [category, catTerms] (category)}
          {#if catTerms.length > 0}
            <div class="space-y-3">
              <!-- Category Header -->
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{category}</span>
                <div class="h-px flex-1 bg-border/20"></div>
                <span class="text-[10px] font-mono text-muted-foreground/40">[{catTerms.length}]</span>
              </div>

              <div class="grid gap-2">
                {#each catTerms as term (term._id)}
                  <button
                    type="button"
                    class="group relative w-full overflow-hidden rounded-xl border border-border/50 bg-card/70 p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm"
                    onclick={() => handleEditClick(term)}
                  >
                    <div class="relative z-10">
                      <div class="flex items-center justify-between mb-1.5">
                        <h4 class="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {term.term}
                        </h4>
                        {#if term.source}
                           <span class="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-tight bg-muted/50 px-1.5 py-0.5 rounded">
                             {term.source}
                           </span>
                        {/if}
                      </div>
                      
                      <p class="text-[11px] text-muted-foreground leading-relaxed">
                        {term.definition}
                      </p>
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      {/if}
    </div>
  </div>

  <div class={EDITOR_PANEL_LAYOUT.footer}>
      <div class={EDITOR_PANEL_LAYOUT.footerMeta}>
         <span>Glossary Context</span>
         <span>{terms ? terms.length : 0} Terms</span>
      </div>
  </div>
</div>
