<script lang="ts">
  import { useEditorBrain } from "$lib/editor/core/EditorBrain.svelte";
  import PrecisionInput from "./properties/PrecisionInput.svelte";
  import ToolbarButton from "./toolbar/ToolbarButton.svelte";
  import ToolbarColorPicker from "./toolbar/ToolbarColorPicker.svelte";
  import ToolbarDivider from "./toolbar/ToolbarDivider.svelte";
  import ToolbarGroup from "./toolbar/ToolbarGroup.svelte";

  const brain = useEditorBrain();
  const settings = $derived(brain.settings);

  // Derived states
  const heading1Active = $derived(brain.headingLevel === 1);
  const heading2Active = $derived(brain.headingLevel === 2);
  const heading3Active = $derived(brain.headingLevel === 3);
  const bulletListActive = $derived(brain.isBulletList);
  const orderedListActive = $derived(brain.isOrderedList);
  const blockquoteActive = $derived(brain.isBlockquote);

  // Context Awareness
  const isSelection = $derived(brain.selection.from !== brain.selection.to);
  const displayFontSize = $derived(isSelection ? (brain.fontSize || settings.fontSize) : settings.fontSize);
  const displayFontWeight = $derived(isSelection ? (brain.fontWeight || 400) : 400);

  let toolbarStyle = $state("top: 5rem; left: 50%; transform: translateX(-50%);");
  let isInteracting = $state(false);

  export function setInteracting(interacting: boolean) {
    isInteracting = interacting;
  }

  $effect(() => {
    if (!brain.editor || isInteracting) return;

    const { from, to } = brain.selection;
    const isTextSelection = from !== to && !("node" in brain.editor.state.selection);

    if (isTextSelection) {
      const { view } = brain.editor;
      try {
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        const top = Math.min(start.top, end.top);
        const bottom = Math.max(start.bottom, end.bottom);
        const left = (start.left + end.left) / 2;

        if (isNaN(top) || isNaN(left)) {
           throw new Error("Invalid coordinates");
        }

        const HEADER_HEIGHT = 60;
        const TOOLBAR_HEIGHT = 50;

        let finalTop = top - TOOLBAR_HEIGHT - 10;
        if (finalTop < HEADER_HEIGHT) finalTop = bottom + 10;

        toolbarStyle = `top: ${finalTop}px; left: ${left}px; transform: translateX(-50%); transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);`;
      } catch (e) {
        toolbarStyle = "top: 5rem; left: 50%; transform: translateX(-50%); transition: all 0.3s ease-out;";
      }
    } else {
      toolbarStyle = "top: 5rem; left: 50%; transform: translateX(-50%); transition: all 0.3s ease-out;";
    }
  });

  // Size handler
  const handleSizeChange = (val: number) => {
    if (isSelection) {
      brain.setFontSize(val);
    } else {
      brain.updateSettings({ fontSize: val });
    }
  };

  // Insertion Commands
  const addTable = () => brain.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  const addTasklist = () => brain.editor?.chain().focus().toggleTaskList().run();
  const addDetails = () => brain.editor?.chain().focus().setDetails().run();
  const addMath = () => brain.editor?.chain().focus().insertContent('$').run();
  const addImage = () => {
    const url = window.prompt('URL');
    if (url) brain.editor?.chain().focus().setImage({ src: url }).run();
  };
</script>

{#if brain.editor}
  <div
    class="fixed z-[100] flex items-center gap-1 p-1.5 rounded-xl border border-border/60 bg-card shadow-premium animate-in fade-in zoom-in-95 duration-300"
    style={toolbarStyle}
  >
    <!-- 1. TEXT STYLE -->
    <ToolbarGroup>
      <ToolbarButton onclick={() => brain.toggleBold()} isActive={brain.isBold} label="Bold" shortcut="⌘B" iconClass="i-lucide-bold" />
      <ToolbarButton onclick={() => brain.toggleItalic()} isActive={brain.isItalic} label="Italic" shortcut="⌘I" iconClass="i-lucide-italic" />
      <ToolbarButton onclick={() => brain.toggleUnderline()} isActive={brain.isUnderline} label="Underline" shortcut="⌘U" iconClass="i-lucide-underline" />
      <ToolbarButton onclick={() => brain.toggleStrike()} isActive={brain.isStrike} label="Strikethrough" shortcut="⌘⇧X" iconClass="i-lucide-strikethrough" />
    </ToolbarGroup>

    <ToolbarDivider />

    <!-- 2. HEADINGS -->
    <ToolbarGroup>
      <ToolbarButton onclick={() => brain.toggleHeading(1)} isActive={heading1Active} label="Heading 1" shortcut="⌘⌥1" iconClass="i-lucide-heading-1" />
      <ToolbarButton onclick={() => brain.toggleHeading(2)} isActive={heading2Active} label="Heading 2" shortcut="⌘⌥2" iconClass="i-lucide-heading-2" />
      <ToolbarButton onclick={() => brain.toggleHeading(3)} isActive={heading3Active} label="Heading 3" shortcut="⌘⌥3" iconClass="i-lucide-heading-3" />
    </ToolbarGroup>

    <ToolbarDivider />

    <!-- 3. RICH ELEMENTS -->
    <ToolbarGroup>
      <ToolbarButton onclick={addTable} label="Table" iconClass="i-lucide-table" />
      <ToolbarButton onclick={addTasklist} label="Task List" iconClass="i-lucide-list-todo" />
      <ToolbarButton onclick={addDetails} label="Collapsible" iconClass="i-lucide-chevron-down-square" />
      <ToolbarButton onclick={addMath} label="LaTeX" iconClass="i-lucide-sigma" />
      <ToolbarButton onclick={addImage} label="Image" iconClass="i-lucide-image" />
    </ToolbarGroup>

    <ToolbarDivider />

    <!-- 4. ALIGNMENT & LISTS -->
    <ToolbarGroup>
      <ToolbarButton onclick={() => brain.setTextAlign('left')} isActive={brain.textAlign === 'left'} label="Left" iconClass="i-lucide-align-left" />
      <ToolbarButton onclick={() => brain.setTextAlign('center')} isActive={brain.textAlign === 'center'} label="Center" iconClass="i-lucide-align-center" />
      <ToolbarButton onclick={() => brain.setTextAlign('right')} isActive={brain.textAlign === 'right'} label="Right" iconClass="i-lucide-align-right" />
      <ToolbarButton onclick={() => brain.toggleBulletList()} isActive={bulletListActive} label="Bullets" iconClass="i-lucide-list" />
      <ToolbarButton onclick={() => brain.toggleOrderedList()} isActive={orderedListActive} label="Numbers" iconClass="i-lucide-list-ordered" />
    </ToolbarGroup>

    <ToolbarDivider />

    <!-- 5. COLORS -->
    <ToolbarGroup>
      <ToolbarColorPicker
        value={brain.highlightColor}
        onColorSelect={(c) => brain.setHighlight(c)}
        label="Highlight"
        iconClass="i-lucide-highlighter"
        onInteractionChange={setInteracting}
      />
      <ToolbarButton onclick={() => brain.toggleSubscript()} isActive={brain.isSubscript} label="Sub" iconClass="i-lucide-subscript" />
      <ToolbarButton onclick={() => brain.toggleSuperscript()} isActive={brain.isSuperscript} label="Super" iconClass="i-lucide-superscript" />
    </ToolbarGroup>

    <!-- FLEX SPACER -->
    <div class="w-8"></div>

    <!-- 6. FONT PROPERTIES (RIGHT ALIGNED) -->
    <div class="flex items-center gap-2 px-1">
      <PrecisionInput
        label="Size"
        value={displayFontSize}
        onChange={handleSizeChange}
        min={8}
        max={144}
        unitDisplay="px"
        className="w-20"
      />
      
      <PrecisionInput
        label="Weight"
        value={displayFontWeight}
        onChange={(v) => brain.setFontWeight(v)}
        min={100}
        max={900}
        step={1}
        className="w-24"
      />
    </div>
  </div>
{/if}

<style>
  div::-webkit-scrollbar { display: none; }
</style>
