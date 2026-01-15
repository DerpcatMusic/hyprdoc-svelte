/**
 * SlashCommand Extension for Tiptap
 */
import { Extension } from "@tiptap/core";
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import { type CommandItem, slashMenuState } from "./SlashMenuState.svelte";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        startOfLine: false,

        items: ({ query }: { query: string }) => {
          slashMenuState.updateQuery(query);
          return slashMenuState.filteredItems;
        },

        render: () => {
          return {
            onStart: (props: SuggestionProps) => {
              const rect = props.clientRect?.();
              slashMenuState.open(
                props.editor,
                props.range,
                rect ?? null
              );
            },

            onUpdate: (props: SuggestionProps) => {
              if (props.clientRect) {
                const rect = props.clientRect();
                if (rect) slashMenuState.updatePosition(rect);
              }
            },

            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === "Escape") {
                slashMenuState.close();
                return true;
              }
              // Return result of state handler
              return slashMenuState.handleKeyDown(props.event);
            },

            onExit: () => {
              slashMenuState.close();
            },
          };
        },
      }),
    ];
  },
});
