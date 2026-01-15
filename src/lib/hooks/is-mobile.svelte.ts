import { useEventListener } from "runed";

export class IsMobile {
  #current = $state(false);
  #mql: MediaQueryList | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.#mql = window.matchMedia("(max-width: 768px)");
      this.#current = this.#mql.matches;
      
      useEventListener(
        () => this.#mql, 
        "change", 
        (e: MediaQueryListEvent) => {
            this.#current = e.matches;
        }
      );
    }
  }

  get current() {
    return this.#current;
  }

  // Destruction is handled by useEventListener context or not needed if singleton
  destroy() {
    // runed handles cleanup if called in component setup
    // Since this is likely used in a store, it persists.
  }
}
