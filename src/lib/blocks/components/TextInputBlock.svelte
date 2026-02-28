<script lang="ts">
  /**
   * TextInputBlock - Single line text field
   *
   * Edit mode: Shows placeholder input preview
   * Sign mode: Interactive text input field
   */

  import type { BlockMode } from "$lib/blocks/types";
  import type { TextInputData } from "$lib/blocks/definitions/text-input.block";

  interface Props {
    mode: BlockMode;
    data: TextInputData;
    updateData: (updates: Partial<TextInputData>) => void;
    selected: boolean;
  }

  const { mode, data, updateData, selected }: Props = $props();

  const isEditing = $derived(mode === "edit");
  const isSigning = $derived(mode === "sign");

  function handleValueChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    updateData({ value: target.value });
  }
</script>

<div class="text-input-block" class:selected>
  <!-- EDIT MODE: Just show the input preview -->
  {#if isEditing}
    <div class="edit-view">
      <input
        type="text"
        class="field-input disabled"
        value=""
        placeholder={data.placeholder || "Type here..."}
        disabled
      />
    </div>
  {/if}

  <!-- SIGN MODE: Interactive Input -->
  {#if isSigning}
    <div class="sign-view">
      <input
        type="text"
        class="field-input"
        value={data.value}
        placeholder={data.placeholder}
        oninput={handleValueChange}
        maxlength={data.maxLength ?? undefined}
        minlength={data.minLength ?? undefined}
      />
    </div>
  {/if}
</div>

<style>
  .text-input-block {
    width: 100%;
  }

  .edit-view,
  .sign-view {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .field-input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    background: var(--background);
    font-size: 0.875rem;
    transition: all 0.15s ease;
  }

  .field-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary-alpha-20, rgba(0,0,0,0.05));
  }

  .field-input::placeholder {
    color: var(--muted-foreground);
  }

  .field-input.disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
</style>
