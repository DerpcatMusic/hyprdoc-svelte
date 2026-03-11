/**
 * HyprDocBlock - Unified Tiptap Node Extension
 *
 * Single node type that renders ALL custom HyprDoc blocks.
 * Block-specific behavior is determined by the `blockType` attribute.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { SvelteNodeViewRenderer } from "svelte-tiptap";
import { blockRegistry } from "$lib/blocks/registry";
import BlockView from "./BlockView.svelte";

export interface HyprDocBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    hyprDocBlock: {
      /**
       * Insert a HyprDoc block
       */
      insertHyprDocBlock: (attrs: {
        blockType: string;
        data?: Record<string, unknown>;
        partyId?: string | null;
        required?: boolean;
      }) => ReturnType;
    };
  }
}

export const HyprDocBlock = Node.create<HyprDocBlockOptions>({
  name: "hyprDocBlock",

  group: "block",

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: "hyprdoc-block",
      },
    };
  },

  addAttributes() {
    return {
      // Identity
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({ "data-id": attributes.id }),
      },
      blockType: {
        default: "text-input",
        parseHTML: (element) => element.getAttribute("data-block-type"),
        renderHTML: (attributes) => ({ "data-block-type": attributes.blockType }),
      },

      // Assignment
      partyId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-party-id"),
        renderHTML: (attributes) => 
          attributes.partyId ? { "data-party-id": attributes.partyId } : {},
      },

      // Behavior
      required: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-required") === "true",
        renderHTML: (attributes) => 
          attributes.required ? { "data-required": "true" } : {},
      },
      conditional: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-conditional") === "true",
        renderHTML: (attributes) => 
          attributes.conditional ? { "data-conditional": "true" } : {},
      },
      conditionExpr: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-condition-expr"),
        renderHTML: (attributes) => 
          attributes.conditionExpr ? { "data-condition-expr": attributes.conditionExpr } : {},
      },
      runtimePolicy: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-runtime-policy");
          try {
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        },
        renderHTML: (attributes) =>
          attributes.runtimePolicy
            ? { "data-runtime-policy": JSON.stringify(attributes.runtimePolicy) }
            : {},
      },
      integrationBinding: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-integration-binding");
          try {
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        },
        renderHTML: (attributes) =>
          attributes.integrationBinding
            ? {
                "data-integration-binding": JSON.stringify(
                  attributes.integrationBinding
                ),
              }
            : {},
      },

      // Block-specific data (stored as JSON)
      data: {
        default: {},
        parseHTML: (element) => {
          const raw = element.getAttribute("data-block-data");
          try {
            return raw ? JSON.parse(raw) : {};
          } catch {
            return {};
          }
        },
        renderHTML: (attributes) => ({
          "data-block-data": JSON.stringify(attributes.data || {}),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-hyprdoc-block]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-hyprdoc-block": "",
      }),
    ];
  },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return SvelteNodeViewRenderer(BlockView as any);
  },

  addCommands() {
    return {
      insertHyprDocBlock:
        (attrs) =>
        ({ chain }) => {
          const id = crypto.randomUUID();
          const definition = blockRegistry.get(attrs.blockType);
          const defaultData =
            definition?.defaults &&
            typeof definition.defaults === "object" &&
            !Array.isArray(definition.defaults)
              ? (definition.defaults as Record<string, unknown>)
              : {};
          const runtimePolicy = definition?.runtimeDefaults ?? {
            mode: attrs.blockType === "live-value" ? "live_replaceable" : "sealed",
            allowedPaths: attrs.blockType === "live-value" ? ["data.value"] : [],
          };
          const integrationBinding = definition?.integrationDefaults ?? null;

          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                id,
                blockType: attrs.blockType,
                data: {
                  ...defaultData,
                  ...(attrs.data ?? {}),
                },
                partyId: attrs.partyId ?? null,
                required: attrs.required ?? false,
                conditional: false,
                conditionExpr: null,
                runtimePolicy,
                integrationBinding,
              },
            })
            .run();
        },
    };
  },
});

export default HyprDocBlock;
