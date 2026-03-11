<script lang="ts">
  import { useDebounce } from "runed";
  import type { Editor } from "@tiptap/core";
  import type { BaseBlockAttrs } from "$lib/blocks/types";
  import { useEditorBrain } from "$lib/editor/core/EditorBrain.svelte";
  import { blockRegistry } from "$lib/blocks/registry/block-registry.svelte";
  import { partyStore } from "$lib/editor/core/party-store.svelte";
  import { Label } from "$lib/components/ui/label";
  import { Input } from "$lib/components/ui/input";
  import { Switch } from "$lib/components/ui/switch";
  import { Button } from "$lib/components/ui/button";
  import * as Select from "$lib/components/ui/select";
  import { Users, Settings2, Trash2 } from "lucide-svelte";
  import { EDITOR_PANEL_LAYOUT } from "$lib/styles/editor-layout";
  import PrecisionInput from "./PrecisionInput.svelte";

  const brain = useEditorBrain();

  const selectedBlock = $derived.by(() => {
    const _ = brain.updateCount;
    const editor = brain.editor;
    if (!editor) return null;

    const { from } = editor.state.selection;
    const node = editor.state.doc.nodeAt(from);

    if (node?.type.name === "hyprDocBlock") {
      return {
        attrs: node.attrs as Record<string, unknown>,
        pos: from,
      };
    }
    return null;
  });

  const blockDef = $derived(
    selectedBlock ? blockRegistry.get(selectedBlock.attrs.blockType as string) : null
  );

  const parties = $derived(partyStore.parties);

  type BlockTarget = {
    editor: Editor;
    pos: number;
    blockId: string;
  };

  function resolveSelectedTarget(): BlockTarget | null {
    if (!selectedBlock || !brain.editor) return null;
    const blockId = selectedBlock.attrs.id;
    if (typeof blockId !== "string" || blockId.length === 0) return null;

    return {
      editor: brain.editor,
      pos: selectedBlock.pos,
      blockId,
    };
  }

  function getLiveBlockAttrs(target: BlockTarget): Record<string, unknown> | null {
    const node = target.editor.state.doc.nodeAt(target.pos);
    if (!node || node.type.name !== "hyprDocBlock") return null;

    const attrs = node.attrs as Record<string, unknown>;
    if (attrs.id !== target.blockId) return null;
    return attrs;
  }

  function validateBlockData(nextData: Record<string, unknown>): Record<string, unknown> | null {
    const mergedData = {
      ...getDefaultBlockData(),
      ...nextData,
    };

    if (!blockDef?.dataSchema) return mergedData;

    const parseResult = blockDef.dataSchema.safeParse(mergedData);
    if (!parseResult.success) return null;
    if (
      typeof parseResult.data !== "object" ||
      parseResult.data === null ||
      Array.isArray(parseResult.data)
    ) {
      return null;
    }

    return parseResult.data as Record<string, unknown>;
  }

  function getDefaultBlockData(): Record<string, unknown> {
    if (
      !blockDef?.defaults ||
      typeof blockDef.defaults !== "object" ||
      Array.isArray(blockDef.defaults)
    ) {
      return {};
    }
    return blockDef.defaults as Record<string, unknown>;
  }

  const flushBlockData = useDebounce(
    (payload: { target: BlockTarget; data: Record<string, unknown> }) => {
      const liveAttrs = getLiveBlockAttrs(payload.target);
      if (!liveAttrs) return;

      const { tr } = payload.target.editor.state;
      tr.setNodeMarkup(payload.target.pos, undefined, {
        ...liveAttrs,
        data: payload.data,
      });
      payload.target.editor.view.dispatch(tr);
    },
    250,
  );

  function updateBlockAttr(key: string, value: unknown): void {
    const target = resolveSelectedTarget();
    if (!target) return;

    const liveAttrs = getLiveBlockAttrs(target);
    if (!liveAttrs) return;

    const { tr } = target.editor.state;
    tr.setNodeMarkup(target.pos, undefined, {
      ...liveAttrs,
      [key]: value,
    });
    target.editor.view.dispatch(tr);
  }

  function updateBlockData(updates: Record<string, unknown>): void {
    const target = resolveSelectedTarget();
    if (!target) return;

    const liveAttrs = getLiveBlockAttrs(target);
    if (!liveAttrs) return;

    const currentData = (liveAttrs.data ?? {}) as Record<string, unknown>;
    const validatedData = validateBlockData({
      ...getDefaultBlockData(),
      ...currentData,
      ...updates,
    });
    if (!validatedData) return;

    flushBlockData({
      target,
      data: validatedData,
    });
  }

  function isNumeric(val: unknown): boolean {
    return typeof val === 'number';
  }

  function isBoolean(val: unknown): boolean {
    return typeof val === 'boolean';
  }

  const runtimePolicy = $derived(
    (selectedBlock?.attrs.runtimePolicy as BaseBlockAttrs["runtimePolicy"] | undefined) ?? {
      mode: "sealed",
      allowedPaths: [],
    }
  );
  const integrationBinding = $derived(
    (selectedBlock?.attrs.integrationBinding as BaseBlockAttrs["integrationBinding"] | undefined) ??
      null
  );
  const supportsRuntimePolicy = $derived(
    Boolean(
      selectedBlock &&
        blockDef &&
        (selectedBlock.attrs.blockType === "live-value" ||
          "liveMode" in ((blockDef.defaults as Record<string, unknown>) ?? {}) ||
          "integrationBinding" in ((blockDef.defaults as Record<string, unknown>) ?? {}))
    )
  );

  function updateRuntimePolicy(
    updates: Partial<NonNullable<BaseBlockAttrs["runtimePolicy"]>>
  ): void {
    const current = (selectedBlock?.attrs.runtimePolicy as BaseBlockAttrs["runtimePolicy"]) ?? {
      mode: "sealed",
      allowedPaths: [],
    };

    updateBlockAttr("runtimePolicy", {
      ...current,
      ...updates,
    });
  }

  function updateRuntimeCondition(
    updates: Partial<NonNullable<NonNullable<BaseBlockAttrs["runtimePolicy"]>["condition"]>>
  ): void {
    const current =
      (selectedBlock?.attrs.runtimePolicy as BaseBlockAttrs["runtimePolicy"]) ?? null;
    const condition = current?.condition ?? {
      field: "",
      operator: "exists",
    };

    updateBlockAttr("runtimePolicy", {
      ...(current ?? { mode: "sealed", allowedPaths: [] }),
      condition: {
        ...condition,
        ...updates,
      },
    });
  }

  function clearRuntimeCondition(): void {
    const current =
      (selectedBlock?.attrs.runtimePolicy as BaseBlockAttrs["runtimePolicy"]) ?? null;
    if (!current) return;

    updateBlockAttr("runtimePolicy", {
      ...current,
      condition: undefined,
    });
  }

  function updateIntegrationBinding(
    updates: Partial<NonNullable<BaseBlockAttrs["integrationBinding"]>>
  ): void {
    const current =
      (selectedBlock?.attrs.integrationBinding as BaseBlockAttrs["integrationBinding"]) ?? {
        integration: "",
        externalObjectType: "",
        externalObjectIdPath: "",
      };

    updateBlockAttr("integrationBinding", {
      ...current,
      ...updates,
    });
  }

  function clearIntegrationBinding(): void {
    updateBlockAttr("integrationBinding", null);
  }
</script>

<div class={EDITOR_PANEL_LAYOUT.shell}>
  {#if selectedBlock && blockDef}
    <div class={EDITOR_PANEL_LAYOUT.header}>
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Block Inspector</p>
          <h2 class="truncate text-sm font-bold text-foreground">
            {blockDef.name}
          </h2>
        </div>
        <span class="shrink-0 rounded-md border border-border/40 bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
          ID: {(selectedBlock.attrs.id as string).substring(0, 8)}
        </span>
      </div>
    </div>

    <div class={EDITOR_PANEL_LAYOUT.bodyScroll}>
      <div class={EDITOR_PANEL_LAYOUT.bodyPadded + " space-y-5"}>
      
      <section class="space-y-3 rounded-xl border border-border/50 bg-card/60 p-3">
        <Label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</Label>
        
        <div class="space-y-1.5">
           <Label class="text-[10px] text-muted-foreground/70 pl-0.5">Display Label</Label>
           <Input
             value={(selectedBlock.attrs.data as Record<string, unknown>)?.label as string ?? ""}
             oninput={(e: Event) => updateBlockData({ label: (e.currentTarget as HTMLInputElement).value })}
             class="h-9 bg-background border-border/60 rounded-md text-sm"
             placeholder="Enter Field Label"
           />
        </div>
      </section>

      <section class="space-y-3 rounded-xl border border-border/50 bg-card/60 p-3">
        <Label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignment</Label>
        
        {#if parties.length === 0}
          <div class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center bg-muted/20">
            <Users class="size-5 text-muted-foreground/40" />
            <p class="text-[11px] text-muted-foreground">
              No signers available.
            </p>
            <Button 
                variant="outline" 
                size="sm" 
                class="h-7 rounded-md text-[10px] font-bold"
                onclick={() => brain.sidebarOpen = true}
            >
              Add Parties
            </Button>
          </div>
        {:else}
          <div class="grid gap-2">
            <Select.Root 
              type="single"
              value={selectedBlock.attrs.partyId as string ?? "unassigned"}
              onValueChange={(v: string) => updateBlockAttr("partyId", v === "unassigned" ? null : v)}
            >
              <Select.Trigger class="h-10 bg-background border-border/60 rounded-md px-3 text-sm">
                {#snippet children()}
                  <div class="flex items-center gap-2 w-full">
                    <div
                      class="size-3 rounded-full shrink-0"
                      style="background-color: {partyStore.getColor(selectedBlock.attrs.partyId as string | null)}"
                    ></div>
                    <span class="truncate">
                      {partyStore.getName(selectedBlock.attrs.partyId as string | null) ?? "Unassigned"}
                    </span>
                  </div>
                {/snippet}
              </Select.Trigger>
              <Select.Content class="z-[70] rounded-md border-border shadow-md">
                <Select.Item value="unassigned" label="Unassigned" class="text-sm py-2">
                  <div class="flex items-center gap-2">
                    <div class="size-3 rounded-full border border-dashed border-muted-foreground/40"></div>
                    <span>Unassigned</span>
                  </div>
                </Select.Item>
                {#each parties as party (party.id)}
                  <Select.Item value={party.id} label={party.name} class="text-sm py-2">
                    <div class="flex items-center gap-2">
                      <div
                        class="size-3 rounded-full"
                        style="background-color: {party.color}"
                      ></div>
                      <span class="font-medium">{party.name}</span>
                    </div>
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
        {/if}
      </section>

      <section class="space-y-3 rounded-xl border border-border/50 bg-card/60 p-3">
        <Label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Validation</Label>
        
        <div class="rounded-lg border border-border/60 bg-card p-3 space-y-3">
            <div class="flex items-center justify-between">
                <div class="flex flex-col">
                    <Label class="text-[11px] font-medium text-foreground">Required Field</Label>
                </div>
                <Switch
                    checked={selectedBlock.attrs.required as boolean ?? false}
                    onCheckedChange={(v: boolean) => updateBlockAttr("required", v)}
                    class="scale-90"
                />
            </div>
        </div>
      </section>

      {#if supportsRuntimePolicy}
        <section class="space-y-3 rounded-xl border border-border/50 bg-card/60 p-3">
          <Label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Runtime Policy</Label>

          <div class="grid gap-3">
            <div class="space-y-1.5">
              <Label class="text-[10px] text-muted-foreground/70 pl-0.5">Post-seal mode</Label>
              <Select.Root
                type="single"
                value={runtimePolicy?.mode ?? "sealed"}
                onValueChange={(v: string) =>
                  updateRuntimePolicy({
                    mode: v as NonNullable<BaseBlockAttrs["runtimePolicy"]>["mode"],
                    allowedPaths:
                      v === "sealed"
                        ? []
                        : runtimePolicy?.allowedPaths?.length
                          ? runtimePolicy.allowedPaths
                          : ["data.value"],
                  })}
              >
                <Select.Trigger class="h-10 bg-background border-border/60 rounded-md px-3 text-sm">
                  {#snippet children()}
                    <span class="truncate capitalize">{runtimePolicy?.mode ?? "sealed"}</span>
                  {/snippet}
                </Select.Trigger>
                <Select.Content class="z-[70] rounded-md border-border shadow-md">
                  <Select.Item value="sealed" label="Sealed">Sealed</Select.Item>
                  <Select.Item value="live_append_only" label="Append only">Append only</Select.Item>
                  <Select.Item value="live_replaceable" label="Replaceable">Replaceable</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>

            <div class="space-y-1.5">
              <Label class="text-[10px] text-muted-foreground/70 pl-0.5">Allowed mutation paths</Label>
              <Input
                value={(runtimePolicy?.allowedPaths ?? []).join(", ")}
                oninput={(e: Event & { currentTarget: HTMLInputElement }) =>
                  updateRuntimePolicy({
                    allowedPaths: e.currentTarget.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })}
                class="h-9 bg-background border-border/60 rounded-md text-sm"
                placeholder="data.value"
              />
            </div>

            <div class="rounded-lg border border-border/40 bg-card/40 p-3 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex flex-col">
                  <Label class="text-[11px] font-medium text-foreground">Activation condition</Label>
                  <span class="text-[10px] text-muted-foreground">Optional runtime gate before this block can mutate</span>
                </div>
                <Switch
                  checked={Boolean(runtimePolicy?.condition)}
                  onCheckedChange={(enabled: boolean) =>
                    enabled
                      ? updateRuntimeCondition({ field: "", operator: "exists" })
                      : clearRuntimeCondition()}
                  class="scale-90"
                />
              </div>

              {#if runtimePolicy?.condition}
                <div class="grid gap-2">
                  <Input
                    value={runtimePolicy.condition.field}
                    oninput={(e: Event & { currentTarget: HTMLInputElement }) =>
                      updateRuntimeCondition({ field: e.currentTarget.value })}
                    class="h-8 bg-background border-border/60 rounded-md text-xs"
                    placeholder="block:payment_status:data.value"
                  />
                  <Select.Root
                    type="single"
                    value={runtimePolicy.condition.operator}
                    onValueChange={(v: string) =>
                      updateRuntimeCondition({
                        operator: v as NonNullable<NonNullable<BaseBlockAttrs["runtimePolicy"]>["condition"]>["operator"],
                      })}
                  >
                    <Select.Trigger class="h-8 bg-background border-border/60 rounded-md px-3 text-xs">
                      {#snippet children()}
                        <span class="truncate">{runtimePolicy.condition.operator}</span>
                      {/snippet}
                    </Select.Trigger>
                    <Select.Content class="z-[70] rounded-md border-border shadow-md">
                      <Select.Item value="exists" label="Exists">Exists</Select.Item>
                      <Select.Item value="eq" label="Equals">Equals</Select.Item>
                      <Select.Item value="neq" label="Not equal">Not equal</Select.Item>
                      <Select.Item value="gt" label="Greater than">Greater than</Select.Item>
                      <Select.Item value="gte" label="Greater or equal">Greater or equal</Select.Item>
                      <Select.Item value="lt" label="Less than">Less than</Select.Item>
                      <Select.Item value="lte" label="Less or equal">Less or equal</Select.Item>
                      <Select.Item value="in" label="In">In</Select.Item>
                    </Select.Content>
                  </Select.Root>
                  {#if runtimePolicy.condition.operator !== "exists"}
                    <Input
                      value={String(runtimePolicy.condition.value ?? "")}
                      oninput={(e: Event & { currentTarget: HTMLInputElement }) =>
                        updateRuntimeCondition({ value: e.currentTarget.value })}
                      class="h-8 bg-background border-border/60 rounded-md text-xs"
                      placeholder="Comparison value"
                    />
                  {/if}
                </div>
              {/if}
            </div>

            <div class="rounded-lg border border-border/40 bg-card/40 p-3 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex flex-col">
                  <Label class="text-[11px] font-medium text-foreground">Integration owner</Label>
                  <span class="text-[10px] text-muted-foreground">Optional external system that owns this runtime value</span>
                </div>
                <Switch
                  checked={Boolean(integrationBinding)}
                  onCheckedChange={(enabled: boolean) =>
                    enabled
                      ? updateIntegrationBinding({
                          integration: "",
                          externalObjectType: "",
                          externalObjectIdPath: "",
                        })
                      : clearIntegrationBinding()}
                  class="scale-90"
                />
              </div>

              {#if integrationBinding}
                <div class="grid gap-2">
                  <Input
                    value={integrationBinding.integration}
                    oninput={(e: Event & { currentTarget: HTMLInputElement }) =>
                      updateIntegrationBinding({ integration: e.currentTarget.value })}
                    class="h-8 bg-background border-border/60 rounded-md text-xs"
                    placeholder="hubspot"
                  />
                  <Input
                    value={integrationBinding.externalObjectType}
                    oninput={(e: Event & { currentTarget: HTMLInputElement }) =>
                      updateIntegrationBinding({ externalObjectType: e.currentTarget.value })}
                    class="h-8 bg-background border-border/60 rounded-md text-xs"
                    placeholder="deal"
                  />
                  <Input
                    value={integrationBinding.externalObjectIdPath}
                    oninput={(e: Event & { currentTarget: HTMLInputElement }) =>
                      updateIntegrationBinding({ externalObjectIdPath: e.currentTarget.value })}
                    class="h-8 bg-background border-border/60 rounded-md text-xs"
                    placeholder="payload.dealId"
                  />
                  <Input
                    value={integrationBinding.idempotencyKeyPath ?? ""}
                    oninput={(e: Event & { currentTarget: HTMLInputElement }) =>
                      updateIntegrationBinding({ idempotencyKeyPath: e.currentTarget.value || undefined })}
                    class="h-8 bg-background border-border/60 rounded-md text-xs"
                    placeholder="payload.eventId"
                  />
                </div>
              {/if}
            </div>
          </div>
        </section>
      {/if}

      {#if Object.keys(blockDef.defaults as object).length > 1}
        <section class="space-y-3 rounded-xl border border-border/50 bg-card/60 p-3">
            <Label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuration</Label>
            
            <div class="grid gap-3">
                {#each Object.entries(selectedBlock.attrs.data as Record<string, unknown>) as [key, value] (key)}
                    {#if key !== 'label' && key in (blockDef.defaults as Record<string, unknown>)}
                        <div class="space-y-1.5 p-3 rounded-lg border border-border/40 bg-card/40">
                            <Label class="text-[10px] font-medium text-muted-foreground uppercase">{key.replace(/([A-Z])/g, ' $1')}</Label>
                            
                            {#if isBoolean(value)}
                                <div class="flex items-center justify-between pt-1">
                                    <span class="text-[11px] font-medium capitalize">{key}</span>
                                    <Switch 
                                        checked={value as boolean} 
                                        onCheckedChange={(v: boolean) => updateBlockData({ [key]: v })}
                                        class="scale-90"
                                    />
                                </div>
                            {:else if isNumeric(value)}
                                <PrecisionInput
                                    label={key}
                                    value={value as number}
                                    onChange={(v: number) => updateBlockData({ [key]: v })}
                                    className="w-full"
                                />
                            {:else}
                                <Input
                                    value={value as string ?? ""}
                                    oninput={(e: Event & { currentTarget: HTMLInputElement }) => updateBlockData({ [key]: e.currentTarget.value })}
                                    class="h-8 bg-background border-border/60 rounded-md text-xs"
                                    placeholder={`Enter value`}
                                />
                            {/if}
                        </div>
                    {/if}
                {/each}
            </div>
        </section>
      {/if}

      <div class="pt-4 border-t border-border/20">
        <Button
          variant="outline"
          size="sm"
          class="w-full h-9 rounded-md text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40 transition-colors font-bold"
          onclick={() => brain.editor?.commands.deleteNode("hyprDocBlock")}
        >
          <Trash2 class="size-3.5 mr-2" />
          Delete Block
        </Button>
      </div>

      </div>
    </div>

  {:else}
    <!-- FOCUSED EMPTY STATE -->
    <div class="flex flex-col items-center justify-center h-full text-center p-8">
      <div class="size-12 mb-4 flex items-center justify-center rounded-xl bg-muted/40 border border-border/60">
          <Settings2 class="size-6 text-muted-foreground/30" />
      </div>
      
      <h3 class="text-sm font-bold text-foreground mb-1">
        No Block Selected
      </h3>
      <p class="text-[11px] text-muted-foreground leading-relaxed max-w-[180px]">
        Select a block in the editor to modify its properties and assignments.
      </p>
    </div>
  {/if}
</div>
