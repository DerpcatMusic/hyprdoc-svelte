<script lang="ts">
  /**
   * GlobalVariablesPanel - Redesigned with ULTRATHINK Protocol
   * - Avant-Garde UI Styling
   * - High-Performance Debounced Search
   * - Refined Variable Entry Cards
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
    DraftingCompass,
    Settings,
    Loader2
  } from "lucide-svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { slide, fade } from "svelte/transition";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Select from "$lib/components/ui/select";
  import { useDocument } from "$lib/editor/core/editor-context";
  import { cn } from "$lib/utils";
  import { Label } from "$lib/components/ui/label";
  import { EDITOR_PANEL_LAYOUT } from "$lib/styles/editor-layout";

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
  const debouncedSearch = new Debounced(() => searchValue, 150);
  const searchQuery = $derived(debouncedSearch.current);

  // UI state
  let isAddingMode = $state(false);
  let editingId = $state<string | null>(null);
  let copiedId = $state<string | null>(null);
  let expandedCategories = new SvelteSet(["Company", "Parties", "Custom", "document", "user"]);
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
  // CONFIGURATION
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
    } catch (e) { console.error(e); }
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

  async function saveInlineEdit() {
    if (!inlineEditId) return;
    try {
      await convex.mutation(api.globalVariables.mutations.quickUpdate, {
        id: inlineEditId as Id<"globalVariables">,
        value: inlineEditValue || null,
      });
    } catch (e) { console.error(e); }
    inlineEditId = null;
  }

  function cancelInlineEdit() {
    inlineEditId = null;
    inlineEditValue = "";
  }

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
</script>

<div class={EDITOR_PANEL_LAYOUT.shell}>
  <div class={EDITOR_PANEL_LAYOUT.header}>
    <div class="flex items-center justify-between mb-4">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Data Layer</p>
        <h2 class="text-sm font-bold text-foreground">Variables</h2>
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
        placeholder="Search variables..."
        class="h-8 rounded-md border-border/60 bg-background pl-8 text-xs"
      />
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mt-3">
      {#each [["all", "All"], ["user", "Account"], ["document", "File"]] as [key, label] (key)}
        <button
          class={cn(
            "flex-1 rounded-md py-1 text-[10px] font-bold uppercase tracking-tight transition-all",
            activeTab === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"
          )}
          onclick={() => (activeTab = key as "all" | "document" | "user")}
        >
          {label}
        </button>
      {/each}
    </div>
  </div>

  {#if isAddingMode}
    <div transition:slide={{ duration: 200 }} class="border-b border-border/40 bg-muted/20 p-4 space-y-3">
      <Label class="text-[10px] uppercase font-bold text-muted-foreground">{editingId ? "Edit Variable" : "New Variable"}</Label>

      <div class="flex gap-2">
        <div class="relative flex-1">
          <Input
            bind:value={formData.name}
            placeholder="variable_name"
            disabled={!!editingId}
            class="h-8 px-2 font-mono text-[11px] bg-background border-border/60 rounded-md"
          />
        </div>

        <Select.Root type="single" value={formData.type} onValueChange={(v: string) => (formData.type = v as VariableType)}>
          <Select.Trigger class="h-8 w-[90px] text-[10px] font-bold rounded-md bg-background border-border/60">
            <Select.Value placeholder="Type" class="" />
          </Select.Trigger>
          <Select.Content class="z-[75]">
            {#each Object.entries(TYPE_CONFIG) as [type, config] (type)}
              <Select.Item value={type} label={config.label} class="text-xs py-1.5">
                <div class="flex items-center gap-2">
                  <config.icon class="size-3" />
                  <span>{config.label}</span>
                </div>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <Input
        bind:value={formData.value}
        placeholder="Value (optional)"
        class="h-8 bg-background border-border/60 rounded-md text-xs"
      />

      <div class="flex gap-2">
        <Select.Root type="single" value={formData.scope} onValueChange={(v: string) => (formData.scope = v as "document" | "user")}>
          <Select.Trigger class="h-8 flex-1 text-[10px] font-bold rounded-md bg-background border-border/60">
            <Select.Value placeholder="Scope" class="" />
          </Select.Trigger>
          <Select.Content class="z-[75]">
            <Select.Item value="user" label="Universal" class="text-xs">Universal</Select.Item>
            <Select.Item value="document" label="This File" class="text-xs">This File</Select.Item>
          </Select.Content>
        </Select.Root>

        <Select.Root type="single" value={formData.category} onValueChange={(v: string) => (formData.category = v)}>
          <Select.Trigger class="h-8 flex-1 text-[10px] font-bold rounded-md bg-background border-border/60">
            <Select.Value placeholder="Category" class="" />
          </Select.Trigger>
          <Select.Content class="z-[75]">
            {#each ["Company", "Personal", "Parties", "Financial", "Terms", "Custom"] as cat (cat)}
              <Select.Item value={cat} label={cat} class="text-xs">{cat}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="flex gap-2 pt-1">
        <Button size="sm" class="flex-1 h-8 rounded-md text-[11px] font-bold" onclick={handleSave} disabled={!formData.name}>
          {editingId ? "Update" : "Create"}
        </Button>
        <Button size="sm" variant="outline" class="h-8 px-3 rounded-md text-[11px] font-bold" onclick={resetForm}>
          Cancel
        </Button>
      </div>
    </div>
  {/if}

  <div class={EDITOR_PANEL_LAYOUT.bodyScroll}>
    <div class={EDITOR_PANEL_LAYOUT.bodyPadded + " space-y-4"}>
      {#if variablesQuery.isLoading && !variables}
        <div class="flex items-center justify-center p-12">
            <Loader2 class="size-5 animate-spin text-muted-foreground/40" />
        </div>
      {:else if !variables || filteredVariables.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center">
           <p class="text-[11px] font-medium text-muted-foreground">No variables found.</p>
        </div>
      {:else}
        {#each sortedCategories as category (category)}
          {@const catVars = groupedVariables[category]}
          {@const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Custom}
          {@const isExpanded = expandedCategories.has(category)}

          <div class="space-y-1.5 rounded-xl border border-border/40 bg-card/40 p-2.5">
            <!-- Category Header -->
            <button
              class="flex items-center gap-2 w-full group py-1"
              onclick={() => toggleCategory(category)}
            >
              <config.icon class={cn("size-3", config.color)} />
              <span class="flex-1 text-left text-[10px] font-bold uppercase tracking-tight text-muted-foreground">{category}</span>
              <ChevronRight class={cn("size-3 text-muted-foreground/40 transition-transform", isExpanded && "rotate-90")} />
            </button>

            <!-- Variables Grid -->
            {#if isExpanded}
              <div transition:slide={{ duration: 200 }} class="grid gap-2">
                {#each catVars as variable (variable._id)}
                  {@const typeConfig = TYPE_CONFIG[variable.type as VariableType] || TYPE_CONFIG.text}
                  {@const isSystem = typeof variable._id === "string" && (variable._id.startsWith("system_") || variable._id.startsWith("signer_"))}
                  {@const isInlineEditing = inlineEditId === variable._id}

                  <div
                    class={cn(
                      "group relative flex items-center gap-3 rounded-md border border-border/40 bg-card/80 px-3 py-2 transition-colors hover:border-primary/30",
                      isSystem && "opacity-60"
                    )}
                  >
                    <!-- Type Indicator -->
                    <typeConfig.icon class={cn("size-3.5 shrink-0", typeConfig.color)} />

                    <!-- Name + Value -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="font-mono text-[10px] font-bold text-foreground truncate">
                          {variable.name}
                        </span>
                        {#if variable.isRequired && !variable.value}
                           <div class="size-1.5 rounded-full bg-destructive"></div>
                        {/if}
                      </div>

                      {#if isInlineEditing}
                        <div class="flex items-center gap-1 mt-1">
                          <Input
                            bind:value={inlineEditValue}
                            class="h-6 text-[10px] flex-1 bg-background rounded-sm"
                            onkeydown={(e: KeyboardEvent) => {
                              if (e.key === "Enter") saveInlineEdit();
                              if (e.key === "Escape") cancelInlineEdit();
                            }}
                          />
                        </div>
                      {:else}
                        <button
                          class="text-[10px] text-muted-foreground truncate block text-left hover:text-primary transition-colors"
                          onclick={() => !isSystem && (inlineEditId = variable._id as string, inlineEditValue = String(variable.value ?? ""))}
                          disabled={isSystem}
                        >
                          {variable.value !== null && variable.value !== "" ? String(variable.value) : (isSystem ? "DYNAMIC" : "EMPTY")}
                        </button>
                      {/if}
                    </div>

                    <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-7 rounded-md"
                        onclick={() => handleCopy(variable.name, variable._id as string)}
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
                        class="size-7 rounded-md text-primary"
                        onclick={() => handleInsert(variable)}
                      >
                         <Plus class="size-4" />
                      </Button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class={EDITOR_PANEL_LAYOUT.footer}>
      <div class={EDITOR_PANEL_LAYOUT.footerMeta}>
         <span>System Context</span>
         <span>v1.2.0</span>
      </div>
  </div>
</div>
