import { PersistedState } from "runed";

/**
 * UiStore
 *
 * Global UI preferences store using Svelte 5 runes.
 * Singleton pattern - single instance shared across the app.
 */
class UiStore {
  theme = new PersistedState<"light" | "dark">("theme", "light", {
    serializer: {
      serialize: (val) => JSON.stringify(val),
      deserialize: (val) => {
        try {
          return JSON.parse(val);
        } catch {
          return val as any;
        }
      }
    }
  });
  corporateMode = new PersistedState<boolean>("corporate-mode", false, {
    serializer: {
      serialize: (val) => JSON.stringify(val),
      deserialize: (val) => {
        try {
          return JSON.parse(val);
        } catch {
          return val === "true";
        }
      }
    }
  });

  // Dashboard navigation state
  dashboardView = $state<"templates" | "envelopes" | "signed" | "settings">(
    "templates"
  );
  viewingTemplateId = $state<string | null>(null);
  importPickerTriggered = $state(0);

  // Properties Panel tab
  propertiesTab = $state<"document" | "block" | "parties">("document");

  setPropertiesTab(tab: "document" | "block" | "parties") {
    this.propertiesTab = tab;
  }

  openImportPicker() {
    this.dashboardView = "templates";
    this.viewingTemplateId = null;
    this.importPickerTriggered++;
  }

  toggleTheme() {
    this.theme.current = this.theme.current === "light" ? "dark" : "light";
  }

  setTheme(theme: "light" | "dark") {
    this.theme.current = theme;
  }
  
  applyTheme() {
    if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", this.theme.current === "dark");
    }
  }

  toggleCorporateMode() {
    this.corporateMode.current = !this.corporateMode.current;
  }

  setCorporateMode(enabled: boolean) {
    this.corporateMode.current = enabled;
  }

  applyCorporateMode() {
    if (typeof document !== "undefined") {
        if (this.corporateMode.current) {
            document.documentElement.setAttribute("data-corporate-mode", "true");
        } else {
            document.documentElement.removeAttribute("data-corporate-mode");
        }
    }
  }

  setDashboardView(view: "templates" | "envelopes" | "signed" | "settings") {
    this.dashboardView = view;
    this.viewingTemplateId = null; // Clear drill-down when switching views
  }

  viewTemplate(id: string) {
    this.viewingTemplateId = id;
  }
  
  constructor() {
    // Initialize effects for DOM updates
    $effect.root(() => {
        $effect(() => {
            this.applyTheme();
            this.applyCorporateMode();
        });
    });
  }
}

// Export singleton instance
export const uiStore = new UiStore();

/**
 * Convenience helper for mode toggles in sidebar/header components
 */
export const modeToggle = {
  get isCorporate() {
    return uiStore.corporateMode.current;
  },
  get isDark() {
    return uiStore.theme.current === "dark";
  },
  toggleCorporate() {
    uiStore.toggleCorporateMode();
  },
  toggleTheme() {
    uiStore.toggleTheme();
  },
};
