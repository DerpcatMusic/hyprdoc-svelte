/**
 * SlashMenuState - Minimal slash menu state
 */

import type { Editor } from "@tiptap/core";
import type { Range } from "@tiptap/core";

export interface CommandItem {
  type: string;
  title: string;
  description: string;
  icon: string;
  category?: string;
  command?: (editor: Editor, range: Range) => void;
}

export interface MenuPosition {
  x: number;
  y: number;
  placement: "above" | "below";
}

const NATIVE_COMMANDS: CommandItem[] = [
  {
    type: "heading1",
    title: "Heading 1",
    description: "Big section heading",
    icon: "i-lucide-heading-1",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    type: "heading2",
    title: "Heading 2",
    description: "Medium section heading",
    icon: "i-lucide-heading-2",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    type: "table",
    title: "Table",
    description: "Insert a 3x3 table",
    icon: "i-lucide-table",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    type: "taskList",
    title: "Task List",
    description: "Project management checklist",
    icon: "i-lucide-list-todo",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    type: "details",
    title: "Collapsible",
    description: "Toggleable content section",
    icon: "i-lucide-chevron-down-square",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setDetails().run();
    },
  },
  {
    type: "bulletList",
    title: "Bullet List",
    description: "Simple bulleted list",
    icon: "i-lucide-list",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    type: "codeBlock",
    title: "Code Block",
    description: "Syntax highlighted code",
    icon: "i-lucide-code",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    type: "math",
    title: "Math (LaTeX)",
    description: "Mathematical formulas",
    icon: "i-lucide-sigma",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertContent('$').run();
    },
  },
  {
    type: "horizontalRule",
    title: "Divider",
    description: "Visually separate content",
    icon: "i-lucide-minus",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  // ════════════════════════════════════════════════════════════════════════════
  // HYPRDOC BLOCKS
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: "text-input",
    title: "Text Input",
    description: "Single line text field for signers",
    icon: "i-lucide-text-cursor-input",
    category: "blocks",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertHyprDocBlock({
        blockType: "text-input",
        data: { label: "Enter text", placeholder: "Type here...", value: "", maxLength: null, minLength: null },
        required: false,
      }).run();
    },
  },
  {
    type: "signature",
    title: "Signature",
    description: "Signature capture field",
    icon: "i-lucide-pen-tool",
    category: "blocks",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertHyprDocBlock({
        blockType: "signature",
        data: { label: "Signature", signatureData: null, signedAt: null, signerName: null },
        required: false,
      }).run();
    },
  },
];

export class SlashMenuState {
  isOpen = $state(false);
  items = $state<CommandItem[]>([]);
  filteredItems = $state<CommandItem[]>([]);
  selectedIndex = $state(0);
  position = $state<MenuPosition>({ x: 0, y: 0, placement: "below" });
  query = $state("");

  #editor: Editor | null = null;
  #range: Range | null = null;

  open(editor: Editor, range: Range, rect: DOMRect | null) {
    this.#editor = editor;
    this.#range = range;
    this.items = [...NATIVE_COMMANDS];
    this.filteredItems = this.items;
    this.selectedIndex = 0;
    this.query = "";

    if (rect) {
      this.updatePosition(rect);
    }
    this.isOpen = true;
  }

  updatePosition(rect: DOMRect) {
    const MENU_HEIGHT = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    this.position = {
      x: rect.left,
      y: spaceBelow < MENU_HEIGHT ? rect.top - 5 : rect.bottom + 5,
      placement: spaceBelow < MENU_HEIGHT ? "above" : "below",
    };
  }

  updateQuery(query: string) {
    this.query = query;
    this.filteredItems = this.items.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase())
    );
    this.selectedIndex = 0;
  }

  close() {
    this.isOpen = false;
    this.#editor = null;
    this.#range = null;
  }

  selectItem(item: CommandItem) {
    if (item.command && this.#editor && this.#range) {
      item.command(this.#editor, this.#range);
    }
    this.close();
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.isOpen) return false;
    if (event.key === "ArrowUp") { 
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.filteredItems.length) % this.filteredItems.length; 
      return true; 
    }
    if (event.key === "ArrowDown") { 
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.filteredItems.length; 
      return true; 
    }
    if (event.key === "Enter") { 
      event.preventDefault();
      this.selectItem(this.filteredItems[this.selectedIndex]); 
      return true; 
    }
    if (event.key === "Escape") { 
      event.preventDefault();
      this.close(); 
      return true; 
    }
    return false;
  }
}

export const slashMenuState = new SlashMenuState();
