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

// Functionality extensions
import { FileHandler } from "@tiptap/extension-file-handler";
import { Focus } from "@tiptap/extension-focus";

// Custom extensions
import { FontSize } from "$lib/components/editor/extensions/FontSize";
import { FontWeight } from "$lib/components/editor/extensions/FontWeight";
import { CollabCursorExtension } from "$lib/components/editor/extensions/collab-cursor";
import { SlashCommand } from "$lib/components/editor/slash-command/extension";
import { GlossaryExtension } from "$lib/components/editor/extensions/GlossaryExtension";
import { GlobalVariableNode } from "$lib/components/editor/extensions/GlobalVariableNode";
import { TrackChangesExtension } from "$lib/components/editor/extensions/track-changes";
import { CommentMark } from "$lib/components/editor/extensions/CommentMark";
import { TabToVariable, type VariableDefinition } from "$lib/components/editor/extensions/TabToVariable";
import { HyprDocBlock } from "$lib/editor/extensions/HyprDocBlock";

export interface ExtensionFactoryOptions {
  placeholder?: string;
  enableFileHandler?: boolean;
  enableMathematics?: boolean;
  currentUserId?: string;
  /** Variables from database for Tab-to-Variable autocomplete */
  variables?: VariableDefinition[];
  // Track Changes options
  trackChanges?: {
    enabled?: boolean;
    authorId?: string;
    authorName?: string;
    authorColor?: string;
    onChangeCreated?: (change: {
      changeType: "insertion" | "deletion" | "replacement";
      changeId: string;
      originalContent?: string;
      newContent?: string;
      position: number;
      authorName: string;
      authorColor: string;
    }) => void;
    onStatusChange?: (enabled: boolean) => void;
  };
}

const lowlight = createLowlight(common);

export function createEditorExtensions(
  options: ExtensionFactoryOptions = {}
): AnyExtension[] {
  const { 
    placeholder = 'Start typing or press "/" for commands...', 
    enableFileHandler = true,
    enableMathematics = true,
    currentUserId = "",
    trackChanges = {}
  } = options;

  return deduplicateExtensions([
    StarterKit.configure({
      codeBlock: false, 
      dropcursor: {
        color: 'var(--primary)',
        width: 2,
      },
      link: false, // We configure Link separately below
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
      a11y: {
        checkboxLabel: (_node: unknown, checked: boolean) => 
          checked ? 'Task completed' : 'Task not completed',
      },
    }),

    Image.configure({
      inline: true,
      allowBase64: true,
      resize: {
        enabled: true,
        directions: ['top-right', 'bottom-right', 'bottom-left', 'top-left'],
        minWidth: 50,
        minHeight: 50,
        alwaysPreserveAspectRatio: true,
      },
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

    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    TextStyle,
    Color,
    BackgroundColor,
    Highlight.configure({ 
      multicolor: true 
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        target: '_blank',
      },
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
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
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

    SlashCommand,

    CollabCursorExtension.configure({
      users: [],
      currentUserId,
    }),
    GlossaryExtension.configure({
      terms: [],
    }),
    GlobalVariableNode,
    TrackChangesExtension.configure({
      enabled: trackChanges.enabled ?? false,
      authorId: trackChanges.authorId,
      authorName: trackChanges.authorName ?? "User",
      authorColor: trackChanges.authorColor ?? "#6366f1",
      onChangeCreated: trackChanges.onChangeCreated,
      onStatusChange: trackChanges.onStatusChange,
    }),
    CommentMark,
    HyprDocBlock,
    TabToVariable.configure({
      variables: options.variables ?? [],
    }),
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
