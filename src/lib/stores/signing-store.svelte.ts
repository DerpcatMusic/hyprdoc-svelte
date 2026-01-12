import { getContext, onDestroy, setContext } from 'svelte';
import type { FieldValue, FieldValuesMap } from '$lib/types';

const SIGNING_STORE_KEY = Symbol('SIGNING_STORE');

export interface SigningField {
	blockId: string;
	type: string;
	label: string;
	required: boolean;
	value: FieldValue;
	isComplete: boolean;
	pageNumber?: number;
	order: number;
}

/**
 * Helper: Determine if field is complete
 */
function isFieldComplete(value: FieldValue, type: string): boolean {
	if (value === undefined || value === null) { return false; }
	if (typeof value === 'string' && value.trim() === '') { return false; }
	if (type === 'signature' || type === 'initials') {
		if (typeof value === 'object' && !Array.isArray(value) && 'image' in value) { return true; }
		if (typeof value === 'string' && value.startsWith('data:image')) { return true; }
		return false;
	}
	if (type === 'checkbox') { return value === true; }
	if (type === 'date' || type === 'date_signed') {
		return value instanceof Date || (typeof value === 'string' && !Number.isNaN(Date.parse(value)));
	}
	return true;
}

/**
 * SigningStore
 *
 * Svelte 5 rune-based store for managing signing wizard state.
 * Replaces Zustand SigningStore with native Svelte reactivity.
 */
export class SigningStore {
	// Wizard state
	currentStep = $state(0);
	totalSteps = $state(0);
	fields = $state<SigningField[]>([]);
	fieldValues = $state<FieldValuesMap>({});
	previousFieldValues = $state<FieldValuesMap>({});
	validationErrors = $state<Record<string, string | undefined>>({});

	// Status
	isSaving = $state(false);
	isSubmitting = $state(false);
	completedAt = $state<number | null>(null);
	lastSavedAt = $state<number | null>(null);
	lastUpdatedBlockId = $state<string | null>(null);

	// Computed properties
	get progress(): number {
		const requiredFields = this.fields.filter((f) => f.required);

		if (requiredFields.length === 0) {
			if (this.fields.length > 0) {
				const completed = this.fields.filter((f) => f.isComplete).length;
				return Math.round((completed / this.fields.length) * 100);
			}
			return 100;
		}

		const completedRequired = requiredFields.filter((f) => f.isComplete).length;
		return Math.round((completedRequired / requiredFields.length) * 100);
	}

	get currentField(): SigningField | null {
		return this.fields[this.currentStep] || null;
	}

	get canProceed(): boolean {
		const field = this.currentField;
		return !(field?.required ) || field.isComplete;
	}

	get canSubmit(): boolean {
		const requiredFields = this.fields.filter((f) => f.required);
		return requiredFields.length === 0 || requiredFields.every((f) => f.isComplete);
	}

	// --- Methods ---

	/**
	 * Initialize fields from raw field data
	 */
	initializeFields(rawFields: Omit<SigningField, 'isComplete' | 'order'>[]) {
		this.fields = rawFields.map((f, index) => ({
			...f,
			order: index,
			isComplete: isFieldComplete(f.value, f.type)
		}));

		this.totalSteps = this.fields.length;
		this.currentStep = 0;
		this.validationErrors = {};
		this.completedAt = null;

		// Build field values map
		const values: FieldValuesMap = {};
		for (const f of this.fields) {
			if (f.value !== undefined) { values[f.blockId] = f.value; }
		}
		this.fieldValues = values;
	}

	/**
	 * Set current step
	 */
	setCurrentStep(step: number) {
		this.currentStep = Math.max(0, Math.min(step, this.fields.length - 1));
	}

	/**
	 * Go to next step
	 */
	nextStep() {
		if (this.canProceed && this.currentStep < this.fields.length - 1) {
			this.currentStep++;
		}
	}

	/**
	 * Go to previous step
	 */
	prevStep() {
		if (this.currentStep > 0) {
			this.currentStep--;
		}
	}

	/**
	 * Go to specific field by block ID
	 */
	goToField(blockId: string) {
		const index = this.fields.findIndex((f) => f.blockId === blockId);
		if (index !== -1) {
			this.currentStep = index;
		}
	}

	/**
	 * Update field value
	 */
	updateFieldValue(blockId: string, value: FieldValue) {
		const field = this.fields.find((f) => f.blockId === blockId);
		const isComplete = field ? isFieldComplete(value, field.type) : false;

		// Update fields array
		this.fields = this.fields.map((f) => (f.blockId === blockId ? { ...f, value, isComplete } : f));

		// Store previous value
		const previousValue = this.fieldValues[blockId];
		this.previousFieldValues = { ...this.previousFieldValues, [blockId]: previousValue };

		// Update current value
		this.fieldValues = { ...this.fieldValues, [blockId]: value };
		this.lastUpdatedBlockId = blockId;

		// Clear validation error for this field
		const newErrors = { ...this.validationErrors };
		delete newErrors[blockId];
		this.validationErrors = newErrors;
	}

	/**
	 * Clear field value
	 */
	clearFieldValue(blockId: string) {
		this.fields = this.fields.map((f) =>
			f.blockId === blockId ? { ...f, value: undefined, isComplete: false } : f
		);
		this.fieldValues = { ...this.fieldValues, [blockId]: undefined };
	}

	/**
	 * Set validation error for a field
	 */
	setValidationError(blockId: string, error: string | null) {
		if (error === null) {
			const newErrors = { ...this.validationErrors };
			delete newErrors[blockId];
			this.validationErrors = newErrors;
		} else {
			this.validationErrors = { ...this.validationErrors, [blockId]: error };
		}
	}

	/**
	 * Set saving state
	 */
	setSaving(isSaving: boolean) {
		this.isSaving = isSaving;
	}

	/**
	 * Set submitting state
	 */
	setSubmitting(isSubmitting: boolean) {
		this.isSubmitting = isSubmitting;
	}

	/**
	 * Mark signing as complete
	 */
	markComplete() {
		this.completedAt = Date.now();
	}

	/**
	 * Record that data was saved
	 */
	recordSave() {
		this.lastSavedAt = Date.now();
		this.isSaving = false;
	}

	/**
	 * Reset all signing state
	 */
	reset() {
		this.currentStep = 0;
		this.totalSteps = 0;
		this.fields = [];
		this.fieldValues = {};
		this.previousFieldValues = {};
		this.validationErrors = {};
		this.isSaving = false;
		this.isSubmitting = false;
		this.completedAt = null;
		this.lastSavedAt = null;
		this.lastUpdatedBlockId = null;
	}
}

/**
 * Creates and provides the SigningStore to the component tree.
 */
export function setSigningStore() {
	const store = new SigningStore();
	setContext(SIGNING_STORE_KEY, store);

	// Auto-cleanup when the providing component is destroyed
	onDestroy(() => {
		store.reset();
	});

	return store;
}

/**
 * Consumes the SigningStore from the component tree.
 */
export function useSigningStore() {
	const store = getContext<SigningStore>(SIGNING_STORE_KEY);
	if (!store) {
		throw new Error('useSigningStore must be used within a component providing setSigningStore');
	}
	return store;
}
