import type { Editor } from '@tiptap/core';

export interface SnapTarget {
  id: string;
  type: 'h' | 'v';
  position: number; // document coordinate
  start: number;
  end: number;
  isCenter?: boolean;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * findSnappableTargets - Scans the editor's visible nodes and returns 
 * horizontal and vertical lines that can be snapped to.
 */
export function findSnappableTargets(editor: Editor): SnapTarget[] {
  const targets: SnapTarget[] = [];
  const { view } = editor;
  const dom = view.dom;
  
  // Find all block-level elements in the editor
  const blocks = dom.querySelectorAll('.ProseMirror > p, .ProseMirror > h1, .ProseMirror > h2, .ProseMirror > h3, .ProseMirror > blockquote, .ProseMirror > .Tiptap-Image-resizing');
  
  const editorRect = dom.getBoundingClientRect();

  blocks.forEach((block, index) => {
    const rect = block.getBoundingClientRect();
    
    // Relative to editor top-left
    const left = rect.left - editorRect.left;
    const right = rect.right - editorRect.left;
    const top = rect.top - editorRect.top;
    const bottom = rect.bottom - editorRect.top;
    const centerX = left + rect.width / 2;
    const centerY = top + rect.height / 2;

    const id = `target-${index}`;

    // Vertical guides (snapping X)
    targets.push({ id: `${id}-l`, type: 'v', position: left, start: top, end: bottom });
    targets.push({ id: `${id}-r`, type: 'v', position: right, start: top, end: bottom });
    targets.push({ id: `${id}-cx`, type: 'v', position: centerX, start: top, end: bottom, isCenter: true });

    // Horizontal guides (snapping Y)
    targets.push({ id: `${id}-t`, type: 'h', position: top, start: left, end: right });
    targets.push({ id: `${id}-b`, type: 'h', position: bottom, start: left, end: right });
    targets.push({ id: `${id}-cy`, type: 'h', position: centerY, start: left, end: right, isCenter: true });
  });

  return targets;
}

/**
 * calculateSnapping - Compares a target rect against available snap targets
 */
export function calculateSnapping(
  sourceRect: Rect,
  targets: SnapTarget[],
  threshold: number = 5
): { snappedX: number | null; snappedY: number | null; activeGuides: SnapTarget[] } {
  let snappedX: number | null = null;
  let snappedY: number | null = null;
  const activeGuides: SnapTarget[] = [];

  const sourceXEndpoints = [sourceRect.left, sourceRect.right, sourceRect.centerX];
  const sourceYEndpoints = [sourceRect.top, sourceRect.bottom, sourceRect.centerY];

  // Check vertical targets (for X snapping)
  for (const target of targets.filter(t => t.type === 'v')) {
    for (const x of sourceXEndpoints) {
      if (Math.abs(x - target.position) < threshold) {
        // Alignment found
        activeGuides.push(target);
        
        // Calculate the translation needed
        if (x === sourceRect.left) snappedX = target.position;
        else if (x === sourceRect.right) snappedX = target.position - sourceRect.width;
        else if (x === sourceRect.centerX) snappedX = target.position - sourceRect.width / 2;
        
        break;
      }
    }
    if (snappedX !== null) break;
  }

  // Check horizontal targets (for Y snapping)
  for (const target of targets.filter(t => t.type === 'h')) {
    for (const y of sourceYEndpoints) {
      if (Math.abs(y - target.position) < threshold) {
        // Alignment found
        activeGuides.push(target);
        
        if (y === sourceRect.top) snappedY = target.position;
        else if (y === sourceRect.bottom) snappedY = target.position - sourceRect.height;
        else if (y === sourceRect.centerY) snappedY = target.position - sourceRect.height / 2;
        
        break;
      }
    }
    if (snappedY !== null) break;
  }

  return { snappedX, snappedY, activeGuides };
}
