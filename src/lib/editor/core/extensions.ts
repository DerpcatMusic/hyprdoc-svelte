import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CharacterCount } from "@tiptap/extension-character-count";
import { Typography } from "@tiptap/extension-typography";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { Link } from "@tiptap/extension-link";
import { Underline } from "@tiptap/extension-underline";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { BubbleMenu } from "@tiptap/extension-bubble-menu";
import { UniqueID } from "@tiptap/extension-unique-id";

// Code block with syntax highlighting
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";

// Rich media embeds
import { Youtube } from "@tiptap/extension-youtube";
import { Twitch } from "@tiptap/extension-twitch";

// Text styling extensions
import { BackgroundColor } from "@tiptap/extension-text-style/background-color";
import { FontFamily } from "@tiptap/extension-text-style/font-family";
import { LineHeight } from "@tiptap/extension-text-style/line-height";

// Mathematics/LaTeX
import { Mathematics } from "@tiptap/extension-mathematics";
import "katex/dist/katex.min.css";

// Interactive elements
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { Emoji } from "@tiptap/extension-emoji";
import { Mention } from "@tiptap/extension-mention";

// Functionality extensions
import { DragHandle } from "@tiptap/extension-drag-handle";
import { FileHandler } from "@tiptap/extension-file-handler";
import { FloatingMenu } from "@tiptap/extension-floating-menu";
import { Focus } from "@tiptap/extension-focus";
import { TableOfContents } from "@tiptap/extension-table-of-contents";

// Custom extensions
import { FontSize } from "$lib/components/editor/extensions/FontSize";
import { FontWeight } from "$lib/components/editor/extensions/FontWeight";
import { CollabCursorExtension } from "$lib/components/editor/extensions/collab-cursor";
import { SlashCommand } from "$lib/components/editor/slash-command/extension";
import { GlossaryExtension } from "$lib/components/editor/extensions/GlossaryExtension";
import { GlobalVariableNode } from "$lib/components/editor/extensions/GlobalVariableNode";


export interface ExtensionFactoryOptions {
  placeholder?: string;
  enableFileHandler?: boolean;
  enableMathematics?: boolean;
  currentUserId?: string;
}

const lowlight = createLowlight(common);

export function createEditorExtensions(
  options: ExtensionFactoryOptions = {}
): AnyExtension[] {
  const { 
    placeholder = 'Start typing or press "/" for commands...', 
    enableFileHandler = true,
    enableMathematics = true,
    currentUserId = ""
  } = options;

  return deduplicateExtensions([
    StarterKit.configure({
      codeBlock: false, 
      dropcursor: {
        color: 'var(--primary)',
        width: 2,
      },
    }),
    
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: null,
      HTMLAttributes: {
        class: 'bg-muted rounded-md p-4 overflow-x-auto font-mono',
      },
    }),

    Table.configure({
      resizable: true,
      allowTableNodeSelection: true,
      HTMLAttributes: {
        class: 'tiptap-table',
      },
    }),
    TableRow,
    TableHeader,
    TableCell,

    TaskList.configure({
        HTMLAttributes: {
            class: 'tiptap-task-list',
        }
    }),
    TaskItem.configure({
      nested: true,
    }),

    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    Youtube.configure({
      nocookie: true,
    }),
    Twitch,

    Details.configure({
      persist: true,
      HTMLAttributes: {
        class: 'details',
      },
    }),
    DetailsContent,
    DetailsSummary,
    
    Emoji.configure({
      enableEmoticons: true,
    }),
    Mention.configure({
      suggestion: {
        char: '@',
        items: ({ query }) => [],
      },
    }),

    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    TextStyle,
    Color,
    BackgroundColor,
    Highlight.configure({ 
      multicolor: true 
    }),
    Subscript,
    Superscript,
    FontFamily,
    LineHeight,

    FontSize,
    FontWeight,

    ...(enableMathematics ? [
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
        },
      })
    ] : []),

    Placeholder.configure({
      placeholder,
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-empty',
    }),
    CharacterCount,
    Typography,
    UniqueID.configure({
      types: ['heading', 'paragraph'],
    }),

    Focus.configure({
      className: 'has-focus',
      mode: 'all',
    }),

    ...(enableFileHandler ? [
      FileHandler.configure({
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        onDrop: (editor, files) => {
          files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
              const url = reader.result as string;
              if (url) editor.chain().setImage({ src: url }).run();
            };
            reader.readAsDataURL(file);
          });
        },
        onPaste: (editor, files) => {
          files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
              const url = reader.result as string;
              if (url) editor.chain().setImage({ src: url }).run();
            };
            reader.readAsDataURL(file);
          });
        },
      })
    ] : []),

    DragHandle,
    TableOfContents,
    SlashCommand,

    CollabCursorExtension.configure({
      users: [],
      currentUserId,
    }),
    GlossaryExtension.configure({
      terms: [],
    }),
    GlobalVariableNode,
  ]);
}

/**
 * Removes duplicate extensions by name.
 */
function deduplicateExtensions(extensions: AnyExtension[]): AnyExtension[] {
  const seen = new Set<string>();
  return extensions.filter((ext) => {
    if (seen.has(ext.name)) return false;
    seen.add(ext.name);
    return true;
  });
}
