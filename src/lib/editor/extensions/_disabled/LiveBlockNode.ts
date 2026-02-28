// Living Contract - Live Block Tiptap Extension
// Embeds API-driven data blocks that sync in real-time

import { Node, mergeAttributes } from '@tiptap/core';
import { SvelteNodeViewRenderer } from 'svelte-tiptap';
import LiveBlockComponent from './LiveBlockComponent.svelte';
import type { APIBinding } from '../../../convex/contracts/validators';

export interface LiveBlockAttrs {
  blockId: string;
  isLive: boolean;
  apiSource?: APIBinding;
  dataSchema?: string; // Zod schema as string
  syncInterval?: number; // milliseconds
  lastSync?: number;
  syncStatus?: 'success' | 'failed' | 'pending';
  cachedData?: any; // Last synced data
}

export const LiveBlockNode = Node.create({
  name: 'liveBlock',
  
  group: 'block',
  
  content: 'inline*',
  
  defining: true,
  
  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-block-id'),
        renderHTML: (attributes) => ({
          'data-block-id': attributes.blockId,
        }),
      },
      isLive: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-is-live') === 'true',
        renderHTML: (attributes) => ({
          'data-is-live': attributes.isLive,
        }),
      },
      apiSource: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('data-api-source');
          return value ? JSON.parse(value) : null;
        },
        renderHTML: (attributes) => ({
          'data-api-source': attributes.apiSource ? JSON.stringify(attributes.apiSource) : null,
        }),
      },
      dataSchema: {
        default: null,
      },
      syncInterval: {
        default: 60000, // 1 minute default
      },
      lastSync: {
        default: null,
      },
      syncStatus: {
        default: 'pending',
      },
      cachedData: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="live-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'live-block' }), 0];
  },

  addNodeView() {
    return SvelteNodeViewRenderer(LiveBlockComponent);
  },

  addCommands() {
    return {
      setLiveBlock:
        (attributes: Partial<LiveBlockAttrs>) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },

      updateLiveBlockData:
        (blockId: string, data: any, status: 'success' | 'failed') =>
        ({ tr, state }) => {
          const { doc } = state;
          let updated = false;

          doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.blockId === blockId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                cachedData: data,
                lastSync: Date.now(),
                syncStatus: status,
              });
              updated = true;
              return false; // Stop iteration
            }
          });

          return updated;
        },

      triggerLiveBlockSync:
        (blockId: string) =>
        ({ editor }) => {
          // This will trigger the sync in the Svelte component
          const event = new CustomEvent('live-block-sync', {
            detail: { blockId },
          });
          editor.view.dom.dispatchEvent(event);
          return true;
        },
    };
  },
});

export default LiveBlockNode;
