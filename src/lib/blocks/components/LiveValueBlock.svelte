<script lang="ts">
  /**
   * LiveValueBlock
   *
   * Displays a read-only runtime value that may change after seal.
   * This is meant for operational state, not signer-entered content.
   */

  import type { BlockMode } from "$lib/blocks/types";
  import type { BaseBlockAttrs } from "$lib/blocks/types";
  import type { LiveValueData } from "$lib/blocks/definitions/live-value.block";

  interface Props {
    mode: BlockMode;
    attrs: BaseBlockAttrs;
    data: LiveValueData;
    updateData: (updates: Partial<LiveValueData>) => void;
    selected: boolean;
  }

  const { mode, attrs, data, updateData, selected }: Props = $props();

  const isEditing = $derived(mode === "edit");
  const renderedValue = $derived.by(() => {
    if (data.value === null || data.value === undefined || data.value === "") {
      return data.placeholder;
    }

    if (data.format === "currency" && typeof data.value === "number") {
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: data.currencyCode || "USD",
          maximumFractionDigits: 2,
        }).format(data.value);
      } catch {
        return `${data.prefix}${String(data.value)}${data.suffix}`;
      }
    }

    return `${data.prefix}${String(data.value)}${data.suffix}`;
  });

  const hasValue = $derived(
    data.value !== null && data.value !== undefined && data.value !== ""
  );
  const liveModeLabel = $derived.by(() => {
    switch (attrs.runtimePolicy?.mode) {
      case "live_append_only":
        return "Append-only";
      case "live_replaceable":
        return "Replaceable";
      default:
        return "Sealed";
    }
  });
  const integrationLabel = $derived(
    attrs.integrationBinding?.integration
      ? `${attrs.integrationBinding.integration} runtime`
      : "Manual runtime"
  );

  function cycleFormat() {
    if (!isEditing) {
      return;
    }

    const nextFormat =
      data.format === "text"
        ? "status"
        : data.format === "status"
          ? "currency"
          : "text";
    updateData({ format: nextFormat });
  }
</script>

<div
  class="live-value-block"
  class:selected
  data-live-mode={attrs.runtimePolicy?.mode ?? "sealed"}
>
  <div class="block-shell">
    <div class="block-header">
      <div class="header-copy">
        <span class="block-label">{data.label}</span>
        <span class="block-meta">{integrationLabel} • {liveModeLabel}</span>
      </div>

      {#if isEditing}
        <button
          type="button"
          class="format-toggle"
          onclick={cycleFormat}
          aria-label="Cycle live value format"
        >
          {data.format}
        </button>
      {/if}
    </div>

    <div class:placeholder={!hasValue} class="value-surface" data-format={data.format}>
      {renderedValue}
    </div>

    {#if isEditing}
      <div class="editor-note">
        This block is runtime-owned after seal. Use it for CRM, payment, or delivery state.
      </div>
    {/if}
  </div>
</div>

<style>
  .live-value-block {
    width: 100%;
  }

  .block-shell {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.875rem;
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent),
      var(--background);
  }

  .block-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .header-copy {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .block-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--foreground);
  }

  .block-meta {
    font-size: 0.7rem;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .format-toggle {
    padding: 0.3rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--muted, rgba(0, 0, 0, 0.03));
    color: var(--foreground);
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    cursor: pointer;
  }

  .value-surface {
    display: flex;
    align-items: center;
    min-height: 3.25rem;
    padding: 0.9rem 1rem;
    border-radius: 0.75rem;
    background: rgba(15, 23, 42, 0.04);
    color: var(--foreground);
    font-size: 1rem;
    font-weight: 600;
  }

  .value-surface.placeholder {
    color: var(--muted-foreground);
    font-weight: 500;
  }

  .value-surface[data-format="status"] {
    background: rgba(14, 165, 233, 0.08);
    color: var(--foreground);
  }

  .value-surface[data-format="currency"] {
    font-variant-numeric: tabular-nums;
  }

  .editor-note {
    font-size: 0.73rem;
    line-height: 1.45;
    color: var(--muted-foreground);
  }
</style>
