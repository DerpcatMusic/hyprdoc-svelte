<script lang="ts">
  /**
   * GlossaryPanel - Dictionary Management
   * ════════════════════════════════════════════════════════════════════════════
   * Manage legal/business terms with definitions for hover tooltips.
   * Svelte 5 Runes + RUNED for performance.
   */
  import { Debounced } from "runed";
  import { useConvexClient, useQuery } from "convex-svelte";
  import {
    Book,
    Check,
    Loader2,
    PenTool,
    Plus,
    Search,
    Trash2,
    X,
  } from "lucide-svelte";
  import { slide } from "svelte/transition";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { cn } from "$lib/utils";

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
  const debouncedSearch = new Debounced(() => searchValue, 200);
  const searchQuery = $derived(debouncedSearch.current);

  // UI state
  let isAddingMode = $state(false);
  let editingId = $state<string | null>(null);

  // Form state
  let formData = $state({
    term: "",
    definition: "",
    category: "User",
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
    formData = { term: "", definition: "", category: "User" };
    isAddingMode = false;
    editingId = null;
  }

  function handleEditClick(t: TermData) {
    editingId = t._id;
    formData = {
      term: t.term,
      definition: t.definition,
      category: t.category || "User",
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

  // Inline editing
  function startInlineEdit(t: TermData) {
    inlineEditId = t._id;
    inlineEditDef = t.definition;
  }

  async function saveInlineEdit(term: string) {
    if (!inlineEditId) return;
    try {
      await convex.mutation(api.glossary.mutations.updateTerm, {
        id: inlineEditId as Id<"glossaryTerms">,
        term: term,
        definition: inlineEditDef,
      });
    } catch (e) {
      console.error("Failed to save", e);
    }
    inlineEditId = null;
  }

  function cancelInlineEdit() {
    inlineEditId = null;
    inlineEditDef = "";
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

<div class="flex h-full w-full flex-col font-sans bg-card">
  <!-- ═══ HEADER ═══ -->
  <div class="sticky top-0 z-20 flex flex-col gap-2 border-b border-border/40 bg-card px-3 py-3">
    <div class="flex items-center justify-between">
      <h2 class="font-display font-semibold text-foreground text-sm">Glossary</h2>
      <Button
        size="icon"
        variant={isAddingMode ? "secondary" : "ghost"}
        class={cn("h-7 w-7 rounded-full transition-all duration-200", isAddingMode && "rotate-45")}
        onclick={() => (isAddingMode ? resetForm() : (isAddingMode = true))}
      >
        <Plus class="size-4" />
      </Button>
    </div>

    <!-- Search -->
    <div class="relative">
      <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
      <Input
        bind:value={searchValue}
        placeholder="Search terms..."
        class="h-8 pl-8 text-xs bg-muted/40 border-transparent focus-visible:border-primary/30"
      />
    </div>
  </div>

  <!-- ═══ NEW TERM FORM ═══ -->
  {#if isAddingMode}
    <div transition:slide={{ duration: 200 }} class="border-b border-border/40 bg-muted/30 p-3 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {editingId ? "Edit Term" : "New Term"}
        </span>
        {#if editingId}
          <Button
            variant="ghost"
            size="sm"
            class="h-5 px-2 text-[10px] text-destructive hover:bg-destructive/10"
            onclick={handleDelete}
          >
            <Trash2 class="size-3 mr-1" /> Delete
          </Button>
        {/if}
      </div>

      <Input
        bind:value={formData.term}
        placeholder="Term (e.g., 'NDA')"
        class="h-7 text-xs font-semibold"
      />

      <textarea
        bind:value={formData.definition}
        placeholder="Definition..."
        class="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onkeydown={(e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSave();
        }}
      ></textarea>

      <Button class="h-7 w-full text-xs font-medium" onclick={handleSave} disabled={!formData.term || !formData.definition}>
        {editingId ? "Update" : "Add Term"}
      </Button>
    </div>
  {/if}

  <!-- ═══ TERMS LIST ═══ -->
  <ScrollArea class="flex-1">
    <div class="pb-20">
      {#if termsQuery.isLoading}
        <div class="flex justify-center p-8">
          <Loader2 class="size-5 animate-spin text-muted-foreground" />
        </div>
      {:else if !terms || terms.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-muted-foreground/40">
          <Book class="size-8 mb-2 opacity-20" />
          <p class="text-xs">No terms yet</p>
          <p class="text-[10px] mt-1">Add definitions for legal terms</p>
        </div>
      {:else}
        {#each Object.entries(groupedTerms) as [category, catTerms]}
          {#if catTerms.length > 0}
            <div class="border-b border-border/20">
              <!-- Category Header -->
              <div class="flex items-center gap-2 px-3 py-1.5 bg-muted/20">
                <span class="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">{category}</span>
                <span class="text-[9px] text-muted-foreground/40">({catTerms.length})</span>
              </div>

              <!-- Terms -->
              {#each catTerms as term (term._id)}
                {@const isInlineEditing = inlineEditId === term._id}

                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div
                  class="group px-3 py-2.5 border-b border-border/10 hover:bg-muted/30 transition-colors cursor-pointer"
                  onclick={() => handleEditClick(term)}
                  role="button"
                  tabindex="0"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <!-- Term Name -->
                      <div class="flex items-center gap-2 mb-0.5">
                        <span class="font-semibold text-primary text-xs truncate">{term.term}</span>
                        {#if term.source}
                          <span class="text-[8px] text-muted-foreground/50 font-mono uppercase">{term.source}</span>
                        {/if}
                      </div>

                      <!-- Definition (inline editable) -->
                      {#if isInlineEditing}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <div class="flex items-start gap-1 mt-1" onclick={(e: MouseEvent) => e.stopPropagation()} role="none">
                          <textarea
                            bind:value={inlineEditDef}
                            class="flex-1 min-h-[40px] rounded border border-input bg-background px-2 py-1 text-[11px] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            onkeydown={(e: KeyboardEvent) => {
                              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveInlineEdit(term.term);
                              if (e.key === "Escape") cancelInlineEdit();
                            }}
                          ></textarea>
                          <div class="flex flex-col gap-0.5">
                            <Button size="icon" variant="ghost" class="size-5" onclick={() => saveInlineEdit(term.term)}>
                              <Check class="size-3 text-green-500" />
                            </Button>
                            <Button size="icon" variant="ghost" class="size-5" onclick={cancelInlineEdit}>
                              <X class="size-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      {:else}
                        <p class="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {term.definition}
                        </p>
                      {/if}
                    </div>

                    <!-- Edit Icon -->
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-6"
                        onclick={(e: MouseEvent) => {
                          e.stopPropagation();
                          startInlineEdit(term);
                        }}
                      >
                        <PenTool class="size-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {/each}
      {/if}
    </div>
  </ScrollArea>
</div>
