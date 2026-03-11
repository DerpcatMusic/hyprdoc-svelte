import { Node, mergeAttributes } from '@tiptap/core';
import { SvelteNodeViewRenderer } from 'svelte-tiptap';
import GlobalVariable from '../nodes/GlobalVariable.svelte';

export interface GlobalVariableOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    globalVariable: {
      /**
       * Insert a global variable
       */
      setGlobalVariable: (attributes: { id: string; name: string; value?: string; type?: string }) => ReturnType;
    };
  }
}

export const GlobalVariableNode = Node.create<GlobalVariableOptions>({
  name: 'globalVariable',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'global-variable',
      },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
      },
      name: {
        default: null,
      },
      value: {
        default: null,
      },
      type: {
        default: 'text',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-global-variable]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Atom nodes (leaf nodes) cannot have content holes - just return empty span
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-global-variable': '' })];
  },

  addNodeView() {
    return SvelteNodeViewRenderer(GlobalVariable);
  },

  addCommands() {
    return {
      setGlobalVariable:
        attributes =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name, attrs: attributes }).run();
        },
    };
  },
});
