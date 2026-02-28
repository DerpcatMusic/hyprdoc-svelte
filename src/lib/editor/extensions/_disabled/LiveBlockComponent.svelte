<script lang="ts">
// Live Block Svelte Component
// Renders API-driven content with real-time sync

import { onMount, onDestroy } from 'svelte';
import { NodeViewWrapper, type NodeViewProps } from 'svelte-tiptap';
import { useConvexMutation } from 'convex-svelte';
import { api } from '$lib/convex/_generated/api';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-svelte';

let {
  node = $bindable(),
  editor = $bindable(),
  getPos = $bindable(),
  updateAttributes = $bindable(),
}: NodeViewProps = $props();

// Reactive state
let isLoading = $state(false);
let error = $state<string | null>(null);
let displayData = $state<any>(node.attrs.cachedData);

// Convex mutation for syncing
const syncLiveBlock = useConvexMutation(api.contracts.mutations.syncLiveBlock);

// Sync interval timer
let syncTimer: NodeJS.Timeout | null = null;

/**
 * Fetch data from API binding
 */
async function fetchLiveData() {
  const { apiSource, dataSchema } = node.attrs;
  
  if (!apiSource) {
    error = 'No API source configured';
    return;
  }

  isLoading = true;
  error = null;

  try {
    // Build request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...apiSource.headers,
    };

    // Add authentication
    if (apiSource.authentication === 'apiKey') {
      headers['Authorization'] = `Bearer ${import.meta.env.VITE_API_KEY}`;
    }

    // Fetch data
    const response = await fetch(apiSource.endpoint, {
      method: apiSource.method,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const rawData = await response.json();

    // Apply transform
    let transformedData = rawData;
    if (apiSource.transform) {
      try {
        // Create safe eval context
        const transformFn = new Function('data', `return ${apiSource.transform}`);
        transformedData = transformFn(rawData);
      } catch (e) {
        console.error('Transform error:', e);
        throw new Error('Failed to transform API response');
      }
    }

    // Validate with schema if provided
    if (dataSchema) {
      try {
        const { z } = await import('zod');
        const schema = eval(`(${dataSchema})`);
        schema.parse(transformedData);
      } catch (e) {
        console.error('Validation error:', e);
        throw new Error('API data failed schema validation');
      }
    }

    // Update local state
    displayData = transformedData;

    // Update Tiptap attributes
    updateAttributes({
      cachedData: transformedData,
      lastSync: Date.now(),
      syncStatus: 'success',
    });

    // Sync to Convex backend (fire and forget)
    if (node.attrs.envelopeId && node.attrs.blockId) {
      syncLiveBlock({
        envelopeId: node.attrs.envelopeId,
        blockId: node.attrs.blockId,
        syncedData: transformedData,
        syncStatus: 'success',
      }).catch(console.error);
    }

    isLoading = false;
  } catch (e: any) {
    error = e.message || 'Failed to fetch live data';
    isLoading = false;

    // Use fallback if available
    if (apiSource.fallback !== undefined) {
      displayData = apiSource.fallback;
      updateAttributes({
        cachedData: apiSource.fallback,
        syncStatus: 'failed',
      });
    }

    // Notify backend of failure
    if (node.attrs.envelopeId && node.attrs.blockId) {
      syncLiveBlock({
        envelopeId: node.attrs.envelopeId,
        blockId: node.attrs.blockId,
        syncedData: null,
        syncStatus: 'failed',
        errorMessage: error,
      }).catch(console.error);
    }
  }
}

/**
 * Start periodic sync
 */
function startSync() {
  if (!node.attrs.isLive) return;

  // Initial fetch
  fetchLiveData();

  // Set up interval
  const interval = node.attrs.syncInterval || 60000;
  syncTimer = setInterval(fetchLiveData, interval);
}

/**
 * Stop periodic sync
 */
function stopSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

/**
 * Manual refresh
 */
function handleRefresh() {
  fetchLiveData();
}

// Lifecycle
onMount(() => {
  if (node.attrs.isLive) {
    startSync();
  }

  // Listen for manual sync triggers
  const handleSyncEvent = (e: CustomEvent) => {
    if (e.detail.blockId === node.attrs.blockId) {
      fetchLiveData();
    }
  };

  editor.view.dom.addEventListener('live-block-sync', handleSyncEvent as EventListener);

  return () => {
    editor.view.dom.removeEventListener('live-block-sync', handleSyncEvent as EventListener);
  };
});

onDestroy(() => {
  stopSync();
});

// Format display data
function formatData(data: any): string {
  if (typeof data === 'number') {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(data);
  }
  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

// Get last sync time
function getLastSyncText(): string {
  if (!node.attrs.lastSync) return 'Never synced';
  const ago = Date.now() - node.attrs.lastSync;
  const seconds = Math.floor(ago / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
</script>

<NodeViewWrapper class="live-block-wrapper">
  <div class="live-block" data-block-id={node.attrs.blockId}>
    <div class="live-block-header">
      <div class="live-block-indicator">
        {#if node.attrs.isLive}
          <span class="live-badge" class:syncing={isLoading} class:error={error}>
            {#if isLoading}
              <Loader2 class="w-3 h-3 animate-spin" />
            {:else if error}
              <AlertCircle class="w-3 h-3" />
            {:else}
              <span class="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></span>
            {/if}
            <span class="live-text">LIVE</span>
          </span>
        {/if}
      </div>

      <div class="live-block-actions">
        <span class="sync-time text-xs text-muted-foreground">
          {getLastSyncText()}
        </span>
        <button
          type="button"
          class="refresh-btn"
          onclick={handleRefresh}
          disabled={isLoading}
          title="Refresh now"
        >
          <RefreshCw class="w-4 h-4" class:animate-spin={isLoading} />
        </button>
      </div>
    </div>

    <div class="live-block-content">
      {#if error}
        <div class="error-state">
          <AlertCircle class="w-5 h-5 text-destructive" />
          <p class="text-sm text-destructive">{error}</p>
          {#if node.attrs.apiSource?.fallback !== undefined}
            <p class="text-xs text-muted-foreground mt-1">
              Using fallback: {formatData(node.attrs.apiSource.fallback)}
            </p>
          {/if}
        </div>
      {:else if isLoading && !displayData}
        <div class="loading-state">
          <Loader2 class="w-6 h-6 animate-spin text-muted-foreground" />
          <p class="text-sm text-muted-foreground">Loading live data...</p>
        </div>
      {:else if displayData !== null && displayData !== undefined}
        <div class="data-display">
          <div class="data-value text-2xl font-bold">
            {formatData(displayData)}
          </div>
          {#if node.attrs.apiSource?.endpoint}
            <div class="data-source text-xs text-muted-foreground mt-1">
              Source: {new URL(node.attrs.apiSource.endpoint).hostname}
            </div>
          {/if}
        </div>
      {:else}
        <div class="empty-state text-sm text-muted-foreground">
          No data available
        </div>
      {/if}
    </div>
  </div>
</NodeViewWrapper>

<style>
  .live-block-wrapper {
    margin: 1rem 0;
  }

  .live-block {
    border: 2px solid hsl(var(--border));
    border-radius: 0.5rem;
    padding: 1rem;
    background: hsl(var(--card));
    transition: all 0.2s;
  }

  .live-block:hover {
    border-color: hsl(var(--lime));
    box-shadow: 0 0 0 3px hsl(var(--lime) / 0.1);
  }

  .live-block-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid hsl(var(--border));
  }

  .live-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.5rem;
    background: hsl(var(--lime) / 0.1);
    color: hsl(var(--lime));
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    transition: all 0.2s;
  }

  .live-badge.syncing {
    background: hsl(var(--primary) / 0.1);
    color: hsl(var(--primary));
  }

  .live-badge.error {
    background: hsl(var(--destructive) / 0.1);
    color: hsl(var(--destructive));
  }

  .live-block-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .refresh-btn {
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: background 0.2s;
    color: hsl(var(--muted-foreground));
  }

  .refresh-btn:hover:not(:disabled) {
    background: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .live-block-content {
    min-height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .error-state,
  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
  }

  .data-display {
    width: 100%;
    text-align: center;
  }

  .data-value {
    color: hsl(var(--lime));
    font-variant-numeric: tabular-nums;
  }
</style>
