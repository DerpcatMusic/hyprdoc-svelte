<script lang="ts">
  /**
   * GlobalVariablesPanel - Redesigned for Contract Builders
   * ════════════════════════════════════════════════════════════════════════════
   * Visual, fast, and highly configurable variable management.
   * Svelte 5 Runes + RUNED for performance.
   */
  import { Debounced, useEventListener } from "runed";
  import { useConvexClient, useQuery } from "convex-svelte";
  import {
    Building2,
    Calendar,
    Check,
    ChevronDown,
    ChevronRight,
    CircleDollarSign,
    Copy,
    FileText,
    Hash,
    PenTool,
    Plus,
    Scale,
    Search,
    Sparkles,
    ToggleLeft,
    Trash2,
    Type,
    User,
    Users,
    X,
  } from "lucide-svelte";
  import { slide } from "svelte/transition";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import * as Select from "$lib/components/ui/select";
  import { useDocument } from "$lib/editor/core/editor-context";
  import { cn } from "$lib/utils";

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TYPES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  type VariableType = "text" | "number" | "date" | "currency" | "boolean";

  interface VariableData {
    _id: string | Id<"globalVariables">;
    name: string;
    displayName?: string;
    value: string | number | boolean | null;
    type: string;
    scope: "document" | "user" | "system";
    category?: string;
    description?: string;
    isRequired?: boolean;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const doc = useDocument();
  const convex = useConvexClient();

  // Search with debounce using RUNED
  let searchValue = $state("");
  const debouncedSearch = new Debounced(() => searchValue, 200);
  const searchQuery = $derived(debouncedSearch.current);

  // UI state
  let isAddingMode = $state(false);
  let editingId = $state<string | null>(null);
  let copiedId = $state<string | null>(null);
  let expandedCategories = $state<Set<string>>(new Set(["Company", "Parties", "Custom", "document", "user"]));
  let activeTab = $state<"all" | "document" | "user">("all");

  // Form state
  let formData = $state({
    name: "",
    displayName: "",
    value: "",
    type: "text" as VariableType,
    scope: "user" as "document" | "user",
    category: "Custom",
  });

  // Inline edit state
  let inlineEditId = $state<string | null>(null);
  let inlineEditValue = $state("");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUERIES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const queryArgs = $derived({
    query: searchQuery,
    documentId: doc.documentId ?? undefined,
  });

  const variablesQuery = useQuery(api.globalVariables.queries.search, () => queryArgs);
  const variables = $derived(variablesQuery.data as VariableData[] | undefined);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CATEGORY CONFIG (Icons + Colors)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bgColor: string }> = {
    Dates: { icon: Calendar, color: "text-amber-500", bgColor: "bg-amber-500/10" },
    Document: { icon: FileText, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    Signer: { icon: PenTool, color: "text-purple-500", bgColor: "bg-purple-500/10" },
    Company: { icon: Building2, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
    Personal: { icon: User, color: "text-pink-500", bgColor: "bg-pink-500/10" },
    Parties: { icon: Users, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
    Terms: { icon: Scale, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    Financial: { icon: CircleDollarSign, color: "text-green-500", bgColor: "bg-green-500/10" },
    Legal: { icon: Scale, color: "text-red-500", bgColor: "bg-red-500/10" },
    Custom: { icon: Sparkles, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
    document: { icon: FileText, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    user: { icon: User, color: "text-violet-500", bgColor: "bg-violet-500/10" },
    system: { icon: Sparkles, color: "text-gray-500", bgColor: "bg-gray-500/10" },
  };

  const TYPE_CONFIG: Record<VariableType, { icon: any; color: string; label: string }> = {
    text: { icon: Type, color: "text-blue-500", label: "Text" },
    number: { icon: Hash, color: "text-purple-500", label: "Number" },
    date: { icon: Calendar, color: "text-amber-500", label: "Date" },
    currency: { icon: CircleDollarSign, color: "text-emerald-500", label: "Currency" },
    boolean: { icon: ToggleLeft, color: "text-pink-500", label: "Boolean" },
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DERIVED: Grouped variables
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const filteredVariables = $derived.by(() => {
    if (!variables) return [];
    if (activeTab === "all") return variables;
    return variables.filter((v) => v.scope === activeTab);
  });

  const groupedVariables = $derived.by(() => {
    const groups: Record<string, VariableData[]> = {};
    for (const v of filteredVariables) {
      const cat = v.category || v.scope;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(v);
    }
    return groups;
  });

  const categoryOrder = ["Company", "Personal", "Parties", "Financial", "Terms", "Dates", "Document", "Signer", "Custom", "document", "user", "system"];
  const sortedCategories = $derived(
    Object.keys(groupedVariables).sort((a, b) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HANDLERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function resetForm() {
    formData = { name: "", displayName: "", value: "", type: "text", scope: "user", category: "Custom" };
    isAddingMode = false;
    editingId = null;
  }

  function toggleCategory(cat: string) {
    if (expandedCategories.has(cat)) {
      expandedCategories.delete(cat);
    } else {
      expandedCategories.add(cat);
    }
    expandedCategories = new Set(expandedCategories);
  }

  function handleEditClick(v: VariableData) {
    editingId = v._id as string;
    formData = {
      name: v.name,
      displayName: v.displayName || "",
      value: String(v.value ?? ""),
      type: v.type as VariableType,
      scope: v.scope === "system" ? "user" : v.scope,
      category: v.category || "Custom",
    };
    isAddingMode = true;
  }

  async function handleSave() {
    if (!(editingId || formData.name)) return;

    try {
      if (editingId) {
        await convex.mutation(api.globalVariables.mutations.update, {
          id: editingId as Id<"globalVariables">,
          value: formData.value || null,
          displayName: formData.displayName || undefined,
          category: formData.category,
        });
      } else {
        const actualScope = formData.scope === "document" && doc.documentId ? "document" : "user";
        await convex.mutation(api.globalVariables.mutations.create, {
          name: formData.name,
          displayName: formData.displayName || undefined,
          value: formData.value || null,
          type: formData.type,
          scope: actualScope,
          category: formData.category,
          documentId: actualScope === "document" ? doc.documentId! : undefined,
        });
      }
      resetForm();
    } catch (error) {
      console.error("Failed to save variable", error);
    }
  }

  async function handleDelete(id: string | null) {
    if (!id || typeof id !== "string") return;
    if (id.startsWith("system_") || id.startsWith("signer_")) return;
    if (editingId === id) resetForm();

    try {
      await convex.mutation(api.globalVariables.mutations.remove, {
        id: id as Id<"globalVariables">,
      });
    } catch (error) {
      console.error("Failed to delete", error);
    }
  }

  function handleInsert(variable: VariableData) {
    if (!doc.editor) return;
    
    doc.editor.chain().focus().setGlobalVariable({
      id: variable._id as string,
      name: variable.name,
      value: String(variable.value ?? ""),
      type: variable.type
    }).run();
  }

  function handleCopy(name: string, id: string) {
    navigator.clipboard.writeText(`{{${name}}}`);
    copiedId = id;
    setTimeout(() => (copiedId = null), 1500);
  }

  // Inline editing
  function startInlineEdit(v: VariableData) {
    inlineEditId = v._id as string;
    inlineEditValue = String(v.value ?? "");
  }

  async function saveInlineEdit() {
    if (!inlineEditId) return;
    try {
      await convex.mutation(api.globalVariables.mutations.quickUpdate, {
        id: inlineEditId as Id<"globalVariables">,
        value: inlineEditValue || null,
      });
    } catch (e) {
      console.error("Failed to save", e);
    }
    inlineEditId = null;
  }

  function cancelInlineEdit() {
    inlineEditId = null;
    inlineEditValue = "";
  }

  // Keyboard shortcuts
  useEventListener(() => document, "keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && inlineEditId) {
      cancelInlineEdit();
    }
  });
</script>

<div class="flex h-full w-full flex-col font-sans bg-card">
  <!-- ═══ HEADER ═══ -->
  <div class="sticky top-0 z-20 flex flex-col gap-2 border-b border-border/40 bg-card px-3 py-3">
    <div class="flex items-center justify-between">
      <h2 class="font-display font-semibold text-foreground text-sm">Variables</h2>
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
        placeholder="Search variables..."
        class="h-8 pl-8 text-xs bg-muted/40 border-transparent focus-visible:border-primary/30"
      />
    </div>

    <!-- Tab Filter -->
    <div class="flex gap-1 text-[10px]">
      {#each [["all", "All"], ["user", "Global"], ["document", "Document"]] as [key, label]}
        <button
          class={cn(
            "flex-1 py-1 rounded-md font-medium transition-colors",
            activeTab === key ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
          onclick={() => (activeTab = key as "all" | "document" | "user")}
        >
          {label}
        </button>
      {/each}
    </div>
  </div>

  <!-- ═══ NEW VARIABLE FORM ═══ -->
  {#if isAddingMode}
    <div transition:slide={{ duration: 200 }} class="border-b border-border/40 bg-muted/30 p-3 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {editingId ? "Edit Variable" : "New Variable"}
        </span>
        {#if editingId}
          <Button
            variant="ghost"
            size="sm"
            class="h-5 px-2 text-[10px] text-destructive hover:bg-destructive/10"
            onclick={() => handleDelete(editingId)}
          >
            <Trash2 class="size-3 mr-1" /> Delete
          </Button>
        {/if}
      </div>

      <!-- Name Input -->
      <div class="flex gap-2">
        <div class="relative flex-1">
          <span class="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-muted-foreground/60">{'{{'}</span>
          <Input
            bind:value={formData.name}
            placeholder="variable_name"
            disabled={!!editingId}
            class="h-7 px-6 font-mono text-xs"
          />
          <span class="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-muted-foreground/60">{'}}'}</span>
        </div>

        <Select.Root type="single" value={formData.type} onValueChange={(v: string) => (formData.type = v as VariableType)}>
          <Select.Trigger class="h-7 w-[80px] text-[10px]">
            <Select.Value class="" placeholder="Type" />
          </Select.Trigger>
          <Select.Content class="">
            {#each Object.entries(TYPE_CONFIG) as [type, config]}
              <Select.Item value={type} label={config.label} class="text-xs">
                <div class="flex items-center gap-2">
                  <config.icon class="size-3" />
                  <span>{config.label}</span>
                </div>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- Display Name -->
      <Input
        bind:value={formData.displayName}
        placeholder="Display Name (optional)"
        class="h-7 text-xs"
      />

      <!-- Value -->
      <Input
        bind:value={formData.value}
        placeholder="Value..."
        class="h-7 text-xs"
        onkeydown={(e: KeyboardEvent) => e.key === "Enter" && handleSave()}
      />

      <!-- Scope + Category -->
      <div class="flex gap-2">
        <Select.Root type="single" value={formData.scope} onValueChange={(v: string) => (formData.scope = v as "document" | "user")}>
          <Select.Trigger class="h-7 flex-1 text-[10px]">
            <Select.Value class="" placeholder="Scope" />
          </Select.Trigger>
          <Select.Content class="">
            <Select.Item value="user" label="Global (All Docs)" class="text-xs">Global (All Docs)</Select.Item>
            <Select.Item value="document" label="This Document" class="text-xs">This Document Only</Select.Item>
          </Select.Content>
        </Select.Root>

        <Select.Root type="single" value={formData.category} onValueChange={(v: string) => (formData.category = v)}>
          <Select.Trigger class="h-7 flex-1 text-[10px]">
            <Select.Value class="" placeholder="Category" />
          </Select.Trigger>
          <Select.Content class="">
            {#each ["Company", "Personal", "Parties", "Financial", "Terms", "Custom"] as cat}
              <Select.Item value={cat} label={cat} class="text-xs">{cat}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <Button class="h-7 w-full text-xs font-medium" onclick={handleSave} disabled={!formData.name}>
        {editingId ? "Update" : "Create Variable"}
      </Button>
    </div>
  {/if}

  <!-- ═══ VARIABLES LIST ═══ -->
  <ScrollArea class="flex-1">
    <div class="pb-20">
      {#if variablesQuery.isLoading}
        <div class="p-8 text-center text-xs text-muted-foreground/50">Loading...</div>
      {:else if !variables || filteredVariables.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-muted-foreground/40">
          <Sparkles class="size-8 mb-2 opacity-20" />
          <p class="text-xs">No variables yet</p>
          <p class="text-[10px] mt-1">Click + to create one</p>
        </div>
      {:else}
        {#each sortedCategories as category}
          {@const catVars = groupedVariables[category]}
          {@const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Custom}
          {@const isExpanded = expandedCategories.has(category)}

          <div class="border-b border-border/20">
            <!-- Category Header -->
            <button
              class="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted/40 transition-colors"
              onclick={() => toggleCategory(category)}
            >
              <div class={cn("flex items-center justify-center size-5 rounded", config.bgColor, config.color)}>
                <config.icon class="size-3" />
              </div>
              <span class="flex-1 text-left text-xs font-semibold text-foreground/80 capitalize">{category}</span>
              <span class="text-[10px] text-muted-foreground mr-1">{catVars.length}</span>
              {#if isExpanded}
                <ChevronDown class="size-3.5 text-muted-foreground" />
              {:else}
                <ChevronRight class="size-3.5 text-muted-foreground" />
              {/if}
            </button>

            <!-- Variables in Category -->
            {#if isExpanded}
              <div transition:slide={{ duration: 150 }}>
                {#each catVars as variable (variable._id)}
                  {@const typeConfig = TYPE_CONFIG[variable.type as VariableType] || TYPE_CONFIG.text}
                  {@const isSystem = typeof variable._id === "string" && (variable._id.startsWith("system_") || variable._id.startsWith("signer_"))}
                  {@const isInlineEditing = inlineEditId === variable._id}

                  <div
                    class={cn(
                      "group flex items-center gap-2 px-3 py-2 ml-7 border-l border-border/30 hover:bg-muted/30 transition-colors",
                      isSystem && "opacity-70"
                    )}
                  >
                    <!-- Type Icon -->
                    <div class={cn("flex items-center justify-center size-5 rounded bg-muted/50", typeConfig.color)}>
                      <typeConfig.icon class="size-2.5" />
                    </div>

                    <!-- Name + Value -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="font-mono text-[11px] font-medium text-foreground/90 truncate">
                          {variable.name}
                        </span>
                        {#if variable.isRequired && !variable.value}
                          <span class="size-1.5 rounded-full bg-destructive animate-pulse"></span>
                        {/if}
                      </div>

                      <!-- Inline Edit or Display Value -->
                      {#if isInlineEditing}
                        <div class="flex items-center gap-1 mt-0.5">
                          <Input
                            bind:value={inlineEditValue}
                            class="h-5 text-[10px] flex-1"
                            autofocus
                            onkeydown={(e: KeyboardEvent) => {
                              if (e.key === "Enter") saveInlineEdit();
                              if (e.key === "Escape") cancelInlineEdit();
                            }}
                          />
                          <Button size="icon" variant="ghost" class="size-5" onclick={saveInlineEdit}>
                            <Check class="size-3 text-green-500" />
                          </Button>
                          <Button size="icon" variant="ghost" class="size-5" onclick={cancelInlineEdit}>
                            <X class="size-3 text-muted-foreground" />
                          </Button>
                        </div>
                      {:else}
                        <button
                          class="text-[10px] text-muted-foreground truncate block text-left hover:text-foreground transition-colors"
                          onclick={() => !isSystem && startInlineEdit(variable)}
                          disabled={isSystem}
                        >
                          {#if variable.value === null || variable.value === ""}
                            <span class="italic opacity-50">{isSystem ? "Auto" : "Click to set..."}</span>
                          {:else}
                            {String(variable.value)}
                          {/if}
                        </button>
                      {/if}
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-6"
                        onclick={(e: MouseEvent) => {
                          e.stopPropagation();
                          handleCopy(variable.name, variable._id as string);
                        }}
                      >
                        {#if copiedId === variable._id}
                          <Check class="size-3 text-green-500" />
                        {:else}
                          <Copy class="size-3 text-muted-foreground" />
                        {/if}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-6"
                        onclick={(e: MouseEvent) => {
                          e.stopPropagation();
                          handleInsert(variable);
                        }}
                        title="Insert into document"
                      >
                        <Plus class="size-3 text-primary" />
                      </Button>
                      {#if !isSystem}
                        <Button
                          variant="ghost"
                          size="icon"
                          class="size-6"
                          onclick={(e: MouseEvent) => {
                            e.stopPropagation();
                            handleEditClick(variable);
                          }}
                        >
                          <PenTool class="size-3 text-muted-foreground" />
                        </Button>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </ScrollArea>
</div>
