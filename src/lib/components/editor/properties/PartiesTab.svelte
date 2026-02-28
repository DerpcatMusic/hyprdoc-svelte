<script lang="ts">
  /**
   * PartiesTab - Manage document signers/parties
   * Redesigned with ULTRATHINK Protocol
   */
  import { partyStore, type Party } from "$lib/editor/core/party-store.svelte";
  import { Label } from "$lib/components/ui/label";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Plus, Trash2, Users, Check, UserPlus, Pencil } from "lucide-svelte";
  import { EDITOR_PANEL_LAYOUT } from "$lib/styles/editor-layout";
  import SmartColorPicker from "./SmartColorPicker.svelte";

  const parties = $derived(partyStore.parties);

  let editingId = $state<string | null>(null);
  let editingName = $state("");

  function addParty(): void {
    partyStore.addParty();
  }

  function removeParty(id: string): void {
    partyStore.removeParty(id);
  }

  function startEditing(party: Party): void {
    editingId = party.id;
    editingName = party.name;
  }

  function saveEditing(): void {
    if (editingId && editingName.trim()) {
      partyStore.updateParty(editingId, { name: editingName.trim() });
    }
    editingId = null;
    editingName = "";
  }

  function setColor(partyId: string, color: string | undefined): void {
    if (color) {
      partyStore.updateParty(partyId, { color });
    }
  }
</script>

<div class={EDITOR_PANEL_LAYOUT.shell}>
  <div class={EDITOR_PANEL_LAYOUT.header}>
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Party Registry</p>
        <h2 class="text-sm font-bold text-foreground">Parties</h2>
      </div>
      <Button
        variant="default"
        size="sm"
        class="h-8 rounded-md px-3 font-bold text-[11px]"
        onclick={addParty}
      >
        <UserPlus class="size-3.5 mr-2" />
        Add Party
      </Button>
    </div>
  </div>

  <div class={EDITOR_PANEL_LAYOUT.bodyScroll}>
    <div class={EDITOR_PANEL_LAYOUT.bodyPadded + " space-y-4"}>
    {#if parties.length === 0}
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <Users class="size-8 text-muted-foreground/30 mb-4" />
        <p class="text-[11px] text-muted-foreground leading-relaxed max-w-[150px] mb-4">
          Add parties to assign them to document blocks.
        </p>
        <Button variant="outline" size="sm" class="h-8 rounded-md font-bold text-[11px]" onclick={addParty}>
          <Plus class="size-3.5 mr-1.5" />
          Add Party
        </Button>
      </div>
    {:else}
      {#each parties as party (party.id)}
        <div
          class="group relative overflow-hidden rounded-xl border border-border/50 bg-card/70 transition-all hover:border-primary/30 hover:shadow-sm"
        >
          <div 
            class="absolute top-0 bottom-0 left-0 w-1"
            style="background-color: {party.color}"
          ></div>

          <div class="space-y-3 p-3 pl-4">
            <div class="flex items-center justify-between gap-3">
              <div class="flex-1 min-w-0">
                {#if editingId === party.id}
                  <div class="flex items-center gap-1.5">
                    <Input
                      bind:value={editingName}
                      class="h-7 bg-background border-border/60 rounded text-[11px] font-bold"
                      onkeydown={(e: KeyboardEvent) => e.key === "Enter" && saveEditing()}
                      autofocus
                    />
                    <Button variant="ghost" size="icon" class="size-7 shrink-0" onclick={saveEditing}>
                      <Check class="size-4 text-primary" />
                    </Button>
                  </div>
                {:else}
                  <div class="flex items-center gap-1.5 group/title">
                    <h4 class="text-[11px] font-bold text-foreground truncate uppercase tracking-tight">
                      {party.name}
                    </h4>
                    <button 
                      class="size-4 flex items-center justify-center text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors"
                      onclick={() => startEditing(party)}
                    >
                      <Pencil class="size-2.5" />
                    </button>
                  </div>
                {/if}
              </div>

              <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-7 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onclick={() => removeParty(party.id)}
                >
                  <Trash2 class="size-3.5" />
                </Button>
              </div>
            </div>

            <div class="flex items-center gap-2">
               <div class="flex-1 h-px bg-border/10"></div>
               <SmartColorPicker 
                 value={party.color}
                 onColorSelect={(c) => setColor(party.id, c)}
                 label="Party Color"
                 className="w-10 h-5"
               />
               <div class="flex-1 h-px bg-border/10"></div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
    </div>
  </div>

  {#if parties.length > 0}
    <div class={EDITOR_PANEL_LAYOUT.footer}>
      <div class={EDITOR_PANEL_LAYOUT.footerMeta}>
         <span>Registry</span>
         <span>{parties.length} Parties</span>
      </div>
    </div>
  {/if}
</div>
