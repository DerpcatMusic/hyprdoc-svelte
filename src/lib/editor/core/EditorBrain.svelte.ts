import { Editor, type AnyExtension, type JSONContent } from "@tiptap/core";
import { AlignmentPlugin } from "./AlignmentPlugin";
import { editorState } from "./editor-state.svelte";
import { uiStore } from "$lib/stores/ui-store.svelte";
import { setContext, getContext, onDestroy, untrack } from "svelte";
import { FiniteStateMachine, useDebounce } from "runed";
import { browser } from "$app/environment";
import { sanitizeSettings } from "@/convex/domains/settings";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { 
  DEFAULT_DOCUMENT_SETTINGS, 
  type DocumentSettings 
} from "@/convex/domains/settings";

import { partyStore } from "./party-store.svelte";

const BRAIN_KEY = Symbol("EDITOR_BRAIN");

export type EditorMode = "edit" | "sign";
export type CollabStatus = "disconnected" | "connecting" | "connected";
export type SaveStates = "idle" | "waiting" | "saving" | "error";
export type SaveEvents = "CHANGE" | "TIMEOUT" | "SUCCESS" | "FAILURE";

export class EditorBrain {
  // ━━━ CORE STATE ━━━
  editor = $state<Editor | null>(null);
  doc = $state<Doc<"documents"> | null>(null);
  
  // ━━━ UX STATE ━━━
  mode = $state<EditorMode>("edit");
  isPreview = $state(false); // Non-persistent sign mode (testing)
  isMobile = $state(false);
  sidebarOpen = $state(true);
  isFocused = $state(false);
  
  // ━━━ COLLAB STATE ━━━
  collabStatus = $state<CollabStatus>("disconnected");
  activeUsers = $state<Array<{ id: string; name: string; avatar?: string }>>([]);

  // ━━━ REACTIVITY TRIGGERS ━━━
  #selectionTrigger = $state(0);
  selection = $state({ from: 0, to: 0 });
  selectedBlockId = $state<string | null>(null);
  updateCount = $state(0);

  // ━━━ PERSISTENCE STATE ━━━
  #convexClient = $state<any>(null);
  #documentId = $state<Id<"documents"> | null>(null);
  #previewSnapshot = $state<JSONContent | null>(null);
  saveMachine = new FiniteStateMachine<SaveStates, SaveEvents>("idle", {
    idle: { CHANGE: "waiting" },
    waiting: { TIMEOUT: "saving", CHANGE: "waiting" },
    saving: { SUCCESS: "idle", FAILURE: "error", CHANGE: "saving" },
    error: { CHANGE: "waiting" },
  });

  #triggerSave = $state<() => void>(() => {});

  // ━━━ DESIGN MODE STATE ━━━
  showRulers = $state(true);
  snapToElements = $state(true); // Snap to text blocks, lines, centers
  snapThreshold = $state(5);
  
  // Alignment guides (populated during drag/resize operations)
  alignmentGuides = $state<Array<{
    id: string;
    type: 'horizontal' | 'vertical';
    position: number;
    start: number;
    end: number;
    isCenter?: boolean;
  }>>([]);

  toggleRulers() {
    this.showRulers = !this.showRulers;
  }

  clearAlignmentGuides() {
    this.alignmentGuides = [];
  }

  setAlignmentGuides(guides: typeof this.alignmentGuides) {
    this.alignmentGuides = guides;
  }
  // ━━━ DERIVED / COMPUTED ━━━
  get isEditing(): boolean {
    return this.mode === "edit";
  }

  get isSigning(): boolean {
    return this.mode === "sign";
  }

  get isEditable(): boolean {
    return this.mode === "edit" && (this.editor?.isEditable ?? true);
  }

  get canPersist(): boolean {
    return !this.isPreview;
  }

  get documentId(): Id<"documents"> | undefined {
    return this.doc?._id;
  }

  // Safe title access
  get title() {
    return this.doc?.title ?? "Untitled Document";
  }
  set title(value: string) {
    if (this.doc) {
      this.doc.title = value;
    }
  }

  // Document Settings with defaults from Backend Domain
  get settings(): DocumentSettings {
    const rawSettings = this.doc?.settings;
    const s = (rawSettings && typeof rawSettings === "object" ? rawSettings : {}) as Partial<DocumentSettings>;
    
    const parseNum = (val: unknown, fallback: number): number => {
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const p = parseFloat(val);
        return isNaN(p) ? fallback : p;
      }
      return fallback;
    };

    return { 
      ...DEFAULT_DOCUMENT_SETTINGS, 
      ...s,
      pageWidth: parseNum(s.pageWidth, DEFAULT_DOCUMENT_SETTINGS.pageWidth),
      pageHeight: parseNum(s.pageHeight, DEFAULT_DOCUMENT_SETTINGS.pageHeight),
      marginVertical: parseNum(s.marginVertical, DEFAULT_DOCUMENT_SETTINGS.marginVertical),
      marginHorizontal: parseNum(s.marginHorizontal, DEFAULT_DOCUMENT_SETTINGS.marginHorizontal),
      fontBody: (typeof s.fontBody === "string" ? s.fontBody : DEFAULT_DOCUMENT_SETTINGS.fontBody),
      fontTitle: (typeof s.fontTitle === "string" ? s.fontTitle : DEFAULT_DOCUMENT_SETTINGS.fontTitle),
      fontSize: parseNum(s.fontSize, DEFAULT_DOCUMENT_SETTINGS.fontSize),
      lineHeight: parseNum(s.lineHeight, DEFAULT_DOCUMENT_SETTINGS.lineHeight),
      paperTextureOpacity: parseNum(s.paperTextureOpacity, DEFAULT_DOCUMENT_SETTINGS.paperTextureOpacity),
      paperTextureScale: parseNum(s.paperTextureScale, DEFAULT_DOCUMENT_SETTINGS.paperTextureScale),
    };
  }

  // Compatibility with old components expecting doc.documentSettings.current
  get documentSettings() {
    const self = this;
    return {
      get current() {
        return self.settings;
      }
    };
  }



  // Formatting Getters
  get isBold() { this.#selectionTrigger; return this.editor?.isActive("bold") ?? false; }
  get isItalic() { this.#selectionTrigger; return this.editor?.isActive("italic") ?? false; }
  get isUnderline() { this.#selectionTrigger; return this.editor?.isActive("underline") ?? false; }
  get isStrike() { this.#selectionTrigger; return this.editor?.isActive("strike") ?? false; }
  get headingLevel() {
    this.#selectionTrigger;
    if (this.editor?.isActive("heading", { level: 1 })) return 1;
    if (this.editor?.isActive("heading", { level: 2 })) return 2;
    if (this.editor?.isActive("heading", { level: 3 })) return 3;
    return null;
  }
  get isBulletList() { this.#selectionTrigger; return this.editor?.isActive("bulletList") ?? false; }
  get isOrderedList() { this.#selectionTrigger; return this.editor?.isActive("orderedList") ?? false; }
  get isBlockquote() { this.#selectionTrigger; return this.editor?.isActive("blockquote") ?? false; }
  get isSubscript() { this.#selectionTrigger; return this.editor?.isActive("subscript") ?? false; }
  get isSuperscript() { this.#selectionTrigger; return this.editor?.isActive("superscript") ?? false; }
  get textAlign() {
    this.#selectionTrigger;
    if (this.editor?.isActive({ textAlign: "center" })) return "center";
    if (this.editor?.isActive({ textAlign: "right" })) return "right";
    if (this.editor?.isActive({ textAlign: "justify" })) return "justify";
    return "left";
  }
  get fontSize() {
    this.#selectionTrigger;
    const size = this.editor?.getAttributes("textStyle")?.fontSize;
    return size ? parseInt(size) : undefined;
  }
  get fontWeight() {
    this.#selectionTrigger;
    const weight = this.editor?.getAttributes("textStyle")?.fontWeight;
    return weight ? parseInt(weight) : undefined;
  }
  get highlightColor() {
    this.#selectionTrigger;
    return this.editor?.getAttributes("highlight")?.color;
  }
  get canUndo() {
    this.#selectionTrigger;
    return this.editor?.can().undo() ?? false;
  }
  get canRedo() {
    this.#selectionTrigger;
    return this.editor?.can().redo() ?? false;
  }

  constructor(initialDoc?: Doc<"documents">) {
    if (initialDoc) this.doc = initialDoc;
    
    // Setup debounced save
    this.#triggerSave = useDebounce(async () => {
      if (this.saveMachine.current === "waiting") {
        this.saveMachine.send("TIMEOUT");
        await this.performSave();
      }
    }, 2000);

    // Watch for title/settings/parties changes
    $effect(() => {
      const _t = this.title;
      const _s = this.settings;
      const _p = partyStore.parties;
      untrack(() => {
        if (browser && this.editor) this.handleStateChange();
      });
    });

    onDestroy(() => this.destroy());
  }

  // ━━━ CONFIGURATION ━━━
  
  setupPersistence(convexClient: any, documentId: Id<"documents">) {
    this.#convexClient = convexClient;
    this.#documentId = documentId;
  }

  syncGlossary(terms: string[]) {
    if (this.editor) {
      this.editor.commands.updateGlossaryTerms(terms);
    }
  }

  handleStateChange() {
    // If partyStore is updated, this should also trigger
    if (this.saveMachine.current === "idle" || this.saveMachine.current === "error") {
      this.saveMachine.send("CHANGE");
    }
    this.#triggerSave();
  }



  // ━━━ ACTIONS ━━━
  
  mount(element: HTMLElement, extensions: AnyExtension[], content?: JSONContent) {
    if (this.editor) this.editor.destroy();

    this.editor = new Editor({
      element,
      extensions: [
        ...extensions,
        // AlignmentPlugin returns a ProseMirror Plugin, cast to satisfy TypeScript
        AlignmentPlugin({ brain: this, editor: this.editor as any }) as unknown as AnyExtension,
      ],
      content,
      editable: this.mode === "edit",
      onTransaction: ({ transaction, editor }) => {
        untrack(() => {
          this.#selectionTrigger++;
          this.selection = {
            from: transaction.selection.from,
            to: transaction.selection.to,
          };
          
          // Detect if a block is selected and auto-switch tab
          const { from } = transaction.selection;
          const node = editor.state.doc.nodeAt(from);
          if (node?.type.name === "hyprDocBlock") {
            const blockId = node.attrs.id;
            if (this.selectedBlockId !== blockId) {
              this.selectedBlockId = blockId;
              uiStore.setPropertiesTab("block");
            }
          } else {
            this.selectedBlockId = null;
          }
        });
      },
      onUpdate: () => {
        this.updateCount++;
        this.handleStateChange();
      },
      onFocus: () => { this.isFocused = true; },
      onBlur: () => { this.isFocused = false; },
    });
  }

  async performSave(): Promise<void> {
    if (!browser || !this.editor || !this.#documentId || !this.#convexClient) return;
    
    const content = JSON.stringify(this.editor.getJSON());
    const title = this.title;
    const settings = sanitizeSettings(this.settings);

    try {
      await this.#convexClient.mutation(api.documents.mutations.update.quickUpdate, {
        documentId: this.#documentId,
        content,
        title,
        settings, 
        parties: partyStore.parties
      });
      this.saveMachine.send("SUCCESS");
    } catch (err: unknown) {
      if (err instanceof Error && err.message?.includes("Authentication required")) {
        console.debug("[HMR] Skipping save - auth context lost during hot reload");
        return;
      }
      console.error("Save failed:", err);
      this.saveMachine.send("FAILURE");
    }
  }


  setDoc(doc: Doc<"documents">) {
    this.doc = doc;
    if (doc.parties) {
      partyStore.setParties(doc.parties as any[]);
    }
  }

  toggleMode(): void {
    this.mode = this.mode === "edit" ? "sign" : "edit";
    editorState.setMode(this.mode);
    this.editor?.setEditable(this.mode === "edit");
  }

  /** Enter preview mode - snapshot content for restore on exit */
  enterPreview(): void {
    // Snapshot current content before entering preview
    if (this.editor) {
      this.#previewSnapshot = this.editor.getJSON();
    }
    this.mode = "sign";
    this.isPreview = true;
    editorState.setMode("sign");
    editorState.setPreview(true);
    this.editor?.setEditable(false);
  }

  /** Exit preview mode - restore content to discard any preview changes */
  exitPreview(): void {
    // Restore content from snapshot to discard preview changes
    if (this.editor && this.#previewSnapshot) {
      this.editor.commands.setContent(this.#previewSnapshot);
      this.#previewSnapshot = null;
    }
    this.mode = "edit";
    this.isPreview = false;
    editorState.setMode("edit");
    editorState.setPreview(false);
    this.editor?.setEditable(true);
  }

  /** Enter sign mode (with persistence) */
  enterSignMode(): void {
    this.mode = "sign";
    this.isPreview = false;
    editorState.setMode("sign");
    editorState.setPreview(false);
    this.editor?.setEditable(false);
  }

  // Public method for updating settings
  updateSettings(updates: Partial<DocumentSettings>) {
    if (!this.doc) return;
    
    // Ensure doc.settings exists
    if (!this.doc.settings) {
      this.doc.settings = {} as Partial<DocumentSettings>;
    }
    
    // Sanitize numerical updates (Svelte 5 inputs sometimes pass strings)
    const numericFields: (keyof DocumentSettings)[] = [
      "pageWidth", "pageHeight", "marginVertical", "marginHorizontal", 
      "fontSize", "lineHeight", "paperTextureOpacity", "paperTextureScale"
    ];
    
    const sanitizedUpdates: Partial<DocumentSettings> = { ...updates };
    
    for (const field of numericFields) {
      const value = updates[field];
      if (value !== undefined && typeof value === "string") {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          (sanitizedUpdates as Record<string, number>)[field] = parsed;
        }
      }
    }

    // Directly assign properties - Svelte 5 proxies will track granularly
    Object.assign(this.doc.settings as Partial<DocumentSettings>, sanitizedUpdates);
  }



  // ━━━ COMMANDS ━━━
  toggleBold() { this.editor?.chain().focus().toggleBold().run(); }
  toggleItalic() { this.editor?.chain().focus().toggleItalic().run(); }
  toggleUnderline() { this.editor?.chain().focus().toggleUnderline().run(); }
  toggleStrike() { this.editor?.chain().focus().toggleStrike().run(); }
  toggleHeading(level: 1 | 2 | 3) { this.editor?.chain().focus().toggleHeading({ level }).run(); }
  toggleBulletList() { this.editor?.chain().focus().toggleBulletList().run(); }
  toggleOrderedList() { this.editor?.chain().focus().toggleOrderedList().run(); }
  toggleBlockquote() { this.editor?.chain().focus().toggleBlockquote().run(); }
  toggleSubscript() { this.editor?.chain().focus().toggleSubscript().run(); }
  toggleSuperscript() { this.editor?.chain().focus().toggleSuperscript().run(); }
  setTextAlign(align: string) { this.editor?.chain().focus().setTextAlign(align).run(); }
  setHighlight(color?: string) {
    if (color) {
      this.editor?.chain().focus().setHighlight({ color }).run();
    } else {
      this.editor?.chain().focus().unsetHighlight().run();
    }
    // Force a state change to ensure saving even if the mark was already gone
    this.handleStateChange();
  }
  setFontSize(size: number) { this.editor?.commands.setFontSize(size.toString()); }
  setFontWeight(weight: number) { this.editor?.commands.setFontWeight(weight.toString()); }
  setHorizontalRule() { this.editor?.chain().focus().setHorizontalRule().run(); }
  undo() { this.editor?.chain().focus().undo().run(); }
  redo() { this.editor?.chain().focus().redo().run(); }

  destroy() {
    this.editor?.destroy();
    this.editor = null;
  }
}

export function initEditorBrain(initialDoc?: Doc<"documents">) {
  const brain = new EditorBrain(initialDoc);
  setContext(BRAIN_KEY, brain);
  return brain;
}

export function useEditorBrain() {
  const brain = getContext<EditorBrain>(BRAIN_KEY);
  if (!brain) throw new Error("EditorBrain not found.");
  return brain;
}
