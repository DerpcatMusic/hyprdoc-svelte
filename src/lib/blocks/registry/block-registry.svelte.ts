/**
 * Block Registry
 *
 * Reactive registry for block definitions.
 * Uses Svelte 5 runes for reactivity.
 * Loads blocks dynamically via Vite glob imports.
 * 
 * NOTE: Uses module-level singleton because Tiptap node views
 * are mounted outside Svelte's component tree (no context access).
 */

import type { BlockDefinition, BlockCategory } from "$lib/blocks/types";

/**
 * Reactive block registry with dynamic loading.
 */
export class BlockRegistry {
  /** Registered block definitions by type */
  #definitions = $state<Map<string, BlockDefinition>>(new Map());

  /** Block categories */
  #categories = $state<BlockCategory[]>([]);

  /** Loading state */
  loading = $state(true);

  /** Error state */
  error = $state<string | null>(null);

  /** Initialization flag */
  #initialized = false;

  /** In-flight loader guard */
  #loadPromise: Promise<void> | null = null;

  /** Category initialization flag */
  #categoriesLoaded = false;

  // ════════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ════════════════════════════════════════════════════════════════════════════

  get definitions(): Map<string, BlockDefinition> {
    return this.#definitions;
  }

  get categories(): BlockCategory[] {
    return this.#categories;
  }

  get all(): BlockDefinition[] {
    return [...this.#definitions.values()];
  }

  get isInitialized(): boolean {
    return this.#initialized;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REGISTRATION
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Register a block definition.
   */
  register(definition: BlockDefinition): void {
    this.#definitions.set(definition.type, definition);
  }

  /**
   * Register multiple block definitions.
   */
  registerAll(definitions: BlockDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }

  /**
   * Set categories (typically loaded from Convex or static list).
   */
  setCategories(categories: BlockCategory[]): void {
    this.#categories = categories;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get a block definition by type.
   */
  get(type: string): BlockDefinition | undefined {
    return this.#definitions.get(type);
  }

  /**
   * Get all blocks in a category.
   */
  getByCategory(categoryId: string): BlockDefinition[] {
    return this.all.filter((d) => d.categoryId === categoryId);
  }

  /**
   * Get all assignable blocks (can be tied to a signer).
   */
  getAssignable(): BlockDefinition[] {
    return this.all.filter((d) => d.assignable);
  }

  /**
   * Check if a block type exists.
   */
  has(type: string): boolean {
    return this.#definitions.has(type);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DYNAMIC LOADING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Load block definitions from Vite glob imports.
   * Call this once during app initialization.
   */
  async loadFromGlob(): Promise<void> {
    if (this.#initialized) return; // Prevent re-loading
    if (this.#loadPromise) return this.#loadPromise;
    
    this.loading = true;
    this.error = null;

    this.#loadPromise = (async () => {
      try {
        // Dynamic import all block definition files
        const modules = import.meta.glob<{ default: BlockDefinition }>(
          "$lib/blocks/definitions/*.block.ts",
          { eager: false }
        );

        const loaded = await Promise.all(
          Object.values(modules).map((loader) => loader())
        );
        const definitions = loaded
          .map((mod) => mod.default)
          .filter((def): def is BlockDefinition => !!def);

        this.registerAll(definitions);
        this.#initialized = true;
      } catch (err) {
        this.error = err instanceof Error ? err.message : "Failed to load blocks";
      } finally {
        this.loading = false;
        this.#loadPromise = null;
      }
    })();

    return this.#loadPromise;
  }

  /**
   * Load categories from Convex or initialize with defaults.
   */
  async loadCategories(
    fetcher?: () => Promise<BlockCategory[]>
  ): Promise<void> {
    if (this.#categoriesLoaded && !fetcher) return;

    if (fetcher) {
      const cats = await fetcher();
      this.setCategories(cats);
    } else {
      // Default categories
      this.setCategories([
        { id: "input", name: "Input Fields", icon: "i-lucide-text-cursor-input", order: 1 },
        { id: "signature", name: "Signatures", icon: "i-lucide-pen-tool", order: 2 },
        { id: "live", name: "Live Runtime", icon: "i-lucide-activity", order: 3 },
        { id: "content", name: "Content", icon: "i-lucide-file-text", order: 4 },
        { id: "logic", name: "Logic", icon: "i-lucide-git-branch", order: 5 },
        { id: "layout", name: "Layout", icon: "i-lucide-layout", order: 6 },
      ]);
    }

    this.#categoriesLoaded = true;
  }

  /**
   * Ensure definitions and categories are loaded.
   */
  async ready(fetcher?: () => Promise<BlockCategory[]>): Promise<void> {
    await Promise.all([this.loadFromGlob(), this.loadCategories(fetcher)]);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MODULE-LEVEL SINGLETON
// ════════════════════════════════════════════════════════════════════════════

/**
 * Global block registry instance.
 * Use this directly since Tiptap node views can't access Svelte context.
 */
export const blockRegistry = new BlockRegistry();

// Auto-initialize on module load (both SSR and client-safe)
void blockRegistry.ready();
