// convex/globalVariables/types.ts
import type { Id } from '@/convex/_generated/dataModel';

// Type for merged variables (system + user + document)
export interface GlobalVariable {
	_id: Id<'globalVariables'> | string;
	name: string;
	displayName?: string;
	value: string | number | boolean | null;
	type: 'text' | 'number' | 'date' | 'currency' | 'boolean';
	category?: string;
	scope: 'system' | 'user' | 'document';
	fallback?: string;
	createdAt: number;
	updatedAt: number;
}
