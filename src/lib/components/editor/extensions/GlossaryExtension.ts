import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface GlossaryOptions {
  terms: string[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    glossary: {
      updateGlossaryTerms: (terms: string[]) => ReturnType;
    };
  }
}

export const GlossaryExtension = Extension.create<GlossaryOptions>({
  name: "glossary",

  addOptions() {
    return {
      terms: [],
    };
  },

  addCommands() {
    return {
      updateGlossaryTerms:
        (terms: string[]) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(glossaryPluginKey, { terms });
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: glossaryPluginKey,
        state: {
          init() {
            return {
              terms: extension.options.terms,
              regex: createGlossaryRegex(extension.options.terms),
            };
          },
          apply(tr, value) {
            const meta = tr.getMeta(glossaryPluginKey);
            if (meta?.terms) {
              return {
                terms: meta.terms,
                regex: createGlossaryRegex(meta.terms),
              };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            const pluginState = glossaryPluginKey.getState(state);
            if (!pluginState || !pluginState.regex) return DecorationSet.empty;

            const { terms, regex } = pluginState;
            const { doc } = state;
            const decorations: Decoration[] = [];

            doc.descendants((node, pos) => {
              if (!node.isText) return;

              const text = node.text;
              if (!text) return;

              // Reset regex state for global search
              regex.lastIndex = 0;

              let match = regex.exec(text);
              while (match !== null) {
                const from = pos + match.index;
                const to = from + match[0].length;
                const matchedTerm = match[0];

                // Find the canonical term (preserving case if needed)
                const canonicalTerm =
                  terms.find((t: string) => t.toLowerCase() === matchedTerm.toLowerCase()) ||
                  matchedTerm;

                decorations.push(
                  Decoration.inline(from, to, {
                    class:
                      "glossary-term cursor-help bg-amber-100/60 dark:bg-amber-900/30 border-b-2 border-dotted border-amber-500/70 dark:border-amber-400/60 hover:bg-amber-200/80 dark:hover:bg-amber-800/40 hover:border-amber-600 transition-colors rounded-sm px-0.5",
                    "data-glossary-term": canonicalTerm,
                  })
                );

                match = regex.exec(text);
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});

const glossaryPluginKey = new PluginKey("glossary");

function createGlossaryRegex(terms: string[]): RegExp | null {
  if (!terms || terms.length === 0) return null;

  // Sort by length desc to match longest terms first
  const escapedTerms = terms
    .filter(Boolean)
    .map((t) => t.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`))
    .sort((a, b) => b.length - a.length);

  if (escapedTerms.length === 0) return null;

  // Match only whole words
  return new RegExp(String.raw`\b(${escapedTerms.join("|")})\b`, "gi");
}
