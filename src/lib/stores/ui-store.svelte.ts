/**
 * UiStore
 *
 * Global UI preferences store using Svelte 5 runes.
 * Singleton pattern - single instance shared across the app.
 */
class UiStore {
	theme = $state<'light' | 'dark'>('light');
	corporateMode = $state(false);

	// Dashboard navigation state
	dashboardView = $state<'templates' | 'envelopes' | 'signed' | 'settings'>('templates');
	viewingTemplateId = $state<string | null>(null);
	importPickerTriggered = $state(0);

	openImportPicker() {
		this.dashboardView = 'templates';
		this.viewingTemplateId = null;
		this.importPickerTriggered++;
	}

	toggleTheme() {
		this.theme = this.theme === 'light' ? 'dark' : 'light';
	}

	setTheme(theme: 'light' | 'dark') {
		this.theme = theme;
	}

	toggleCorporateMode() {
		this.corporateMode = !this.corporateMode;
	}

	setCorporateMode(enabled: boolean) {
		this.corporateMode = enabled;
	}

	setDashboardView(view: 'templates' | 'envelopes' | 'signed' | 'settings') {
		this.dashboardView = view;
		this.viewingTemplateId = null; // Clear drill-down when switching views
	}

	viewTemplate(id: string) {
		this.viewingTemplateId = id;
	}
}

// Export singleton instance
export const uiStore = new UiStore();

/**
 * Convenience helper for mode toggles in sidebar/header components
 */
export const modeToggle = {
	get isCorporate() {
		return uiStore.corporateMode;
	},
	get isDark() {
		return uiStore.theme === 'dark';
	},
	toggleCorporate() {
		uiStore.toggleCorporateMode();
		// Apply data attribute for CSS
		if (uiStore.corporateMode) {
			document.documentElement.setAttribute('data-corporate-mode', 'true');
		} else {
			document.documentElement.removeAttribute('data-corporate-mode');
		}
		localStorage.setItem('corporate-mode', String(uiStore.corporateMode));
	},
	toggleTheme() {
		uiStore.toggleTheme();
		document.documentElement.classList.toggle('dark', uiStore.theme === 'dark');
		localStorage.setItem('theme', uiStore.theme);
	}
};
