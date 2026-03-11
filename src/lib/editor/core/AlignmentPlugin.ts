import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Editor } from '@tiptap/core';
import type { EditorBrain } from '../core/EditorBrain.svelte';
import { findSnappableTargets, calculateSnapping, type Rect } from '../utils/snapping';

export const alignmentPluginKey = new PluginKey('alignmentPlugin');

export interface AlignmentPluginOptions {
  brain: EditorBrain;
  editor: Editor;
}

export const AlignmentPlugin = (options: AlignmentPluginOptions) => {
  let isInteracting = false;
  let lastActiveElement: HTMLElement | null = null;

  return new Plugin({
    key: alignmentPluginKey,
    view(editorView) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!options.brain.snapToElements) return;

        // Check if an image is being resized or a node is being dragged
        const resizingImage = document.querySelector('.Tiptap-Image-resizing') as HTMLElement;
        const draggingNode = document.querySelector('.ProseMirror-selectednode') as HTMLElement;
        
        const activeElement = resizingImage || draggingNode;

        if (activeElement) {
          isInteracting = true;
          lastActiveElement = activeElement;

          const editorRect = editorView.dom.getBoundingClientRect();
          const targetRect = activeElement.getBoundingClientRect();

          const sourceRect: Rect = {
            left: targetRect.left - editorRect.left,
            top: targetRect.top - editorRect.top,
            right: targetRect.right - editorRect.left,
            bottom: targetRect.bottom - editorRect.top,
            width: targetRect.width,
            height: targetRect.height,
            centerX: (targetRect.left - editorRect.left) + targetRect.width / 2,
            centerY: (targetRect.top - editorRect.top) + targetRect.height / 2,
          };

          const targets = findSnappableTargets(options.editor);
          // Filter out the active element itself from targets
          const filteredTargets = targets.filter(t => {
            // This is a bit crude but works for now: ignore targets that are very close to the active element's original bounds
            // or we could use the ID if we had one.
            return Math.abs(t.position - sourceRect.left) > 1 && 
                   Math.abs(t.position - sourceRect.right) > 1;
          });

          const { activeGuides } = calculateSnapping(sourceRect, filteredTargets, options.brain.snapThreshold);

          // Update brain state to show guides in the UI
          options.brain.setAlignmentGuides(activeGuides.map(g => ({
            id: g.id,
            type: g.type === 'h' ? 'horizontal' : 'vertical',
            position: g.position,
            start: g.start,
            end: g.end,
            isCenter: g.isCenter
          })));
        } else if (isInteracting) {
          isInteracting = false;
          options.brain.clearAlignmentGuides();
        }
      };

      const handleMouseUp = () => {
        if (isInteracting) {
          isInteracting = false;
          options.brain.clearAlignmentGuides();
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return {
        destroy() {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        },
      };
    },
  });
};
