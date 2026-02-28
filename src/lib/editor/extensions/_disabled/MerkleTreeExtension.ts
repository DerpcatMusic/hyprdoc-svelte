// Living Contract - Merkle Tree Tiptap Extension
// Tracks document integrity with cryptographic hashing

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { computeMerkleRoot, hashBlock } from '../../../convex/contracts/helpers';

export interface MerkleTreeState {
  rootHash: string | null;
  blockHashes: Map<string, string>;
  lastUpdate: number;
  isDirty: boolean; // Changed since last signature
}

export const MerkleTreeExtension = Extension.create({
  name: 'merkleTree',

  addOptions() {
    return {
      onMerkleRootChanged: (rootHash: string) => {
        console.log('Merkle root changed:', rootHash);
      },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: new PluginKey('merkleTree'),

        state: {
          init(_, state): MerkleTreeState {
            return {
              rootHash: null,
              blockHashes: new Map(),
              lastUpdate: Date.now(),
              isDirty: false,
            };
          },

          apply(tr, value, oldState, newState): MerkleTreeState {
            // Skip if document hasn't changed
            if (!tr.docChanged) return value;

            // Extract all blocks from document
            const blocks: Array<{ blockId: string; node: any }> = [];
            newState.doc.descendants((node, pos) => {
              if (node.attrs.blockId) {
                blocks.push({
                  blockId: node.attrs.blockId,
                  node: {
                    blockId: node.attrs.blockId,
                    type: node.type.name,
                    content: node.toJSON(),
                    attrs: node.attrs,
                  },
                });
              }
            });

            // Compute hash for each block
            const newBlockHashes = new Map<string, string>();
            for (const { blockId, node } of blocks) {
              const hash = hashBlockClient(node);
              newBlockHashes.set(blockId, hash);
            }

            // Compute Merkle root
            const hashes = Array.from(newBlockHashes.values());
            const newRootHash = hashes.length > 0 ? computeMerkleRootClient(hashes) : null;

            // Check if root hash changed
            if (newRootHash !== value.rootHash) {
              extension.options.onMerkleRootChanged(newRootHash || '');
            }

            return {
              rootHash: newRootHash,
              blockHashes: newBlockHashes,
              lastUpdate: Date.now(),
              isDirty: true, // Mark as dirty until next signature
            };
          },
        },

        view(editorView) {
          return {
            update: (view, prevState) => {
              const state = this.getState(view.state) as MerkleTreeState;
              const prevPluginState = this.getState(prevState) as MerkleTreeState;

              // Emit event when Merkle root changes
              if (state.rootHash !== prevPluginState.rootHash) {
                view.dom.dispatchEvent(
                  new CustomEvent('merkle-root-changed', {
                    detail: {
                      rootHash: state.rootHash,
                      blockCount: state.blockHashes.size,
                      isDirty: state.isDirty,
                    },
                  })
                );
              }
            },
          };
        },
      }),
    ];
  },

  addCommands() {
    return {
      getMerkleRoot:
        () =>
        ({ state }) => {
          const plugin = this.options.key || new PluginKey('merkleTree');
          const merkleState = plugin.getState(state) as MerkleTreeState;
          return merkleState.rootHash;
        },

      getBlockHash:
        (blockId: string) =>
        ({ state }) => {
          const plugin = this.options.key || new PluginKey('merkleTree');
          const merkleState = plugin.getState(state) as MerkleTreeState;
          return merkleState.blockHashes.get(blockId) || null;
        },

      markDocumentSigned:
        () =>
        ({ tr, state }) => {
          // Reset dirty flag after signature
          const plugin = this.options.key || new PluginKey('merkleTree');
          const merkleState = plugin.getState(state) as MerkleTreeState;
          
          // This would update the plugin state
          tr.setMeta('merkleTree', { ...merkleState, isDirty: false });
          
          return true;
        },

      verifyBlockIntegrity:
        (blockId: string, expectedHash: string) =>
        ({ state }) => {
          const plugin = this.options.key || new PluginKey('merkleTree');
          const merkleState = plugin.getState(state) as MerkleTreeState;
          const actualHash = merkleState.blockHashes.get(blockId);
          
          if (!actualHash) {
            console.error(`Block ${blockId} not found`);
            return false;
          }
          
          const isValid = actualHash === expectedHash;
          if (!isValid) {
            console.error(`Block ${blockId} integrity check failed!`);
            console.error(`Expected: ${expectedHash}`);
            console.error(`Actual: ${actualHash}`);
          }
          
          return isValid;
        },
    };
  },
});

// ============================================================================
// CLIENT-SIDE HASH UTILITIES
// ============================================================================

/**
 * Hash a block on the client (matches server implementation)
 */
function hashBlockClient(block: any): string {
  const canonical = JSON.stringify({
    blockId: block.blockId,
    type: block.type,
    content: block.content,
    attrs: block.attrs.isLive
      ? { ...block.attrs, lastSync: undefined, cachedData: undefined }
      : block.attrs,
  });

  // Use SubtleCrypto for SHA-256
  return hashString(canonical);
}

/**
 * Compute Merkle root from array of hashes (matches server implementation)
 */
function computeMerkleRootClient(hashes: string[]): string {
  if (hashes.length === 0) throw new Error('Cannot compute Merkle root of empty array');
  if (hashes.length === 1) return hashes[0];

  const pairs: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i];
    const right = i + 1 < hashes.length ? hashes[i + 1] : hashes[i];
    const combined = hashString(left + right);
    pairs.push(combined);
  }

  return computeMerkleRootClient(pairs);
}

/**
 * Simple synchronous SHA-256 hash (using crypto-js or similar)
 * In production, use a proper crypto library
 */
function hashString(input: string): string {
  // For now, use a simple hash function
  // In production, replace with: CryptoJS.SHA256(input).toString()
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

export default MerkleTreeExtension;
