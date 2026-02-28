<script lang="ts">
  /**
   * SignatureBlock - Signature capture field
   *
   * Edit mode: Shows signature placeholder preview
   * Sign mode: Interactive signature pad
   */

  import type { BlockMode } from "$lib/blocks/types";
  import type { SignatureData } from "$lib/blocks/definitions/signature.block";

  interface Props {
    mode: BlockMode;
    data: SignatureData;
    updateData: (updates: Partial<SignatureData>) => void;
    selected: boolean;
  }

  const { mode, data, updateData, selected }: Props = $props();

  const isEditing = $derived(mode === "edit");
  const isSigning = $derived(mode === "sign");
  const isSigned = $derived(!!data.signatureData);
  const signedAtLabel = $derived.by(() => {
    if (!data.signedAt) return "";
    const parsed = new Date(data.signedAt);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
  });

  function handleSign(): void {
    // Placeholder - in production this would open a signature pad
    updateData({
      signatureData: "signed",
      signedAt: new Date().toISOString(),
      signerName: "Demo User",
    });
  }

  function handleClear(): void {
    updateData({
      signatureData: null,
      signedAt: null,
      signerName: null,
    });
  }
</script>

<div class="signature-block" class:selected>
  <!-- EDIT MODE: Just show signature placeholder -->
  {#if isEditing}
    <div class="edit-view">
      <div class="signature-placeholder">
        <span class="i-lucide-pen-tool size-5 text-muted-foreground"></span>
        <span class="placeholder-text">Signature field</span>
      </div>
    </div>
  {/if}

  <!-- SIGN MODE: Interactive Signature Pad -->
  {#if isSigning}
    <div class="sign-view">
      {#if isSigned}
        <div class="signature-display">
          <div class="signature-content">
            <span class="i-lucide-check-circle size-5 text-emerald-500"></span>
            <div class="signature-info">
              <span class="signer-name">{data.signerName}</span>
              {#if signedAtLabel}
                <span class="signed-at">Signed {signedAtLabel}</span>
              {/if}
            </div>
          </div>
          <button
            type="button"
            class="clear-btn"
            onclick={handleClear}
            aria-label="Clear signature"
            title="Clear signature"
          >
            <span class="i-lucide-x size-4"></span>
          </button>
        </div>
      {:else}
        <button type="button" class="signature-pad" onclick={handleSign}>
          <span class="i-lucide-pen-tool size-5 text-muted-foreground"></span>
          <span class="pad-text">Click to sign</span>
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .signature-block {
    width: 100%;
  }

  .edit-view,
  .sign-view {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .signature-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    border: 2px dashed var(--border);
    border-radius: 0.375rem;
    background: var(--muted, rgba(0,0,0,0.02));
  }

  .placeholder-text {
    font-size: 0.8rem;
    color: var(--muted-foreground);
  }

  .signature-pad {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.5rem;
    border: 2px dashed var(--border);
    border-radius: 0.375rem;
    background: var(--background);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .signature-pad:hover {
    border-color: var(--primary);
    background: var(--primary-alpha-5, rgba(0,0,0,0.02));
  }

  .pad-text {
    font-size: 0.875rem;
    color: var(--muted-foreground);
  }

  .signature-display {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border: 2px solid var(--success, #22c55e);
    border-radius: 0.375rem;
    background: var(--success-alpha-10, rgba(34, 197, 94, 0.1));
  }

  .signature-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .signature-info {
    display: flex;
    flex-direction: column;
  }

  .signer-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--foreground);
  }

  .signed-at {
    font-size: 0.7rem;
    color: var(--muted-foreground);
  }

  .clear-btn {
    padding: 0.375rem;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--muted-foreground);
    transition: color 0.15s ease;
    border-radius: 0.25rem;
  }

  .clear-btn:hover {
    color: var(--destructive);
    background: var(--destructive-alpha-10, rgba(239, 68, 68, 0.1));
  }
</style>
