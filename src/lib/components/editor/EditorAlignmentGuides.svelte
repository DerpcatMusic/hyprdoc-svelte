<script lang="ts">
  /**
   * EditorAlignmentGuides - Smart alignment guides that appear during drag/resize
   * Shows horizontal and vertical guides when elements align with each other
   */

  export interface AlignmentGuide {
    id: string;
    type: 'horizontal' | 'vertical';
    position: number;
    start: number;
    end: number;
    isCenter?: boolean;
  }

  interface Props {
    guides?: AlignmentGuide[];
  }

  let { guides = [] }: Props = $props();
</script>

{#each guides as guide (guide.id)}
  <div
    class="alignment-guide alignment-guide-{guide.type}"
    class:alignment-guide-center={guide.isCenter}
    style={guide.type === 'horizontal' 
      ? `top: ${guide.position}px; left: ${guide.start}px; width: ${guide.end - guide.start}px;`
      : `left: ${guide.position}px; top: ${guide.start}px; height: ${guide.end - guide.start}px;`
    }
    aria-hidden="true"
  ></div>
{/each}

<style>
  .alignment-guide {
    position: absolute;
    pointer-events: none;
    z-index: 20;
  }

  .alignment-guide-horizontal {
    height: 1px;
    background: var(--primary);
  }

  .alignment-guide-horizontal::before,
  .alignment-guide-horizontal::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    background: var(--primary);
    border-radius: 50%;
    top: -2.5px;
  }

  .alignment-guide-horizontal::before { left: -3px; }
  .alignment-guide-horizontal::after { right: -3px; }

  .alignment-guide-vertical {
    width: 1px;
    background: var(--primary);
  }

  .alignment-guide-vertical::before,
  .alignment-guide-vertical::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    background: var(--primary);
    border-radius: 50%;
    left: -2.5px;
  }

  .alignment-guide-vertical::before { top: -3px; }
  .alignment-guide-vertical::after { bottom: -3px; }

  .alignment-guide-center {
    background: linear-gradient(
      var(--angle, 90deg),
      transparent 0%,
      var(--primary) 15%,
      var(--primary) 85%,
      transparent 100%
    );
  }

  .alignment-guide-horizontal.alignment-guide-center {
    --angle: 90deg;
  }

  .alignment-guide-vertical.alignment-guide-center {
    --angle: 180deg;
  }
</style>
