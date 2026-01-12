// convex/globalVariables/logic.ts

import type { Id } from '@/convex/_generated/dataModel';
import type { QueryCtx } from '@/convex/_generated/server';
import { SYSTEM_VARIABLES } from './constants';
import type { GlobalVariable } from './types';

/**
 * Internal helper to list all variables for a document.
 * This is NOT a Convex query - it's a plain function that can be called
 * from multiple queries without triggering the anti-pattern warning.
 */
export async function listForDocumentHelper(
	ctx: QueryCtx,
	args: { documentId?: Id<'documents'> }
): Promise<GlobalVariable[]> {
	const user = await ctx.auth.getUserIdentity();

	// 1. Start with system variables (always available)
	const systemVars: GlobalVariable[] = SYSTEM_VARIABLES.map((sv) => ({
		_id: `system_${sv.name}`,
		...sv,
		value: null,
		scope: 'system' as const,
		fallback: '',
		createdAt: 0,
		updatedAt: 0
	}));

	// 2. Get user-level variables
	let userVars: GlobalVariable[] = [];
	if (user) {
		const dbUser = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', user.subject))
			.first();

		if (dbUser) {
			const userVariables = await ctx.db
				.query('globalVariables')
				.withIndex('by_user', (q) => q.eq('workosId', dbUser._id))
				.collect();

			userVars = userVariables
				.filter((v) => v.scope === 'user')
				.map((v) => ({ ...v, value: v.value ?? null }) as GlobalVariable);
		}
	}

	// 3. Get document-level variables
	let docVars: GlobalVariable[] = [];
	if (args.documentId) {
		const docVariables = await ctx.db
			.query('globalVariables')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();

		docVars = docVariables
			.filter((v) => v.scope === 'document')
			.map((v) => ({ ...v, value: v.value ?? null }) as GlobalVariable);
	}

	// 4. Generate dynamic signer-indexed variables (e.g., signer_01_name, signer_02_email)
	const signerVars: GlobalVariable[] = [];
	if (args.documentId) {
		const signers = await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId!))
			.collect();

		for (const [index, signer] of signers.entries()) {
			const signerNum = String(index + 1).padStart(2, '0'); // "01", "02", etc.
			const baseProps: Pick<
				GlobalVariable,
				'value' | 'scope' | 'fallback' | 'createdAt' | 'updatedAt'
			> = {
				value: null,
				scope: 'system',
				fallback: '',
				createdAt: 0,
				updatedAt: 0
			};

			signerVars.push(
				{
					_id: `signer_${signerNum}_name`,
					name: `signer_${signerNum}_name`,
					displayName: `Signer ${signerNum} Name (${signer.legalName || 'Unnamed'})`,
					type: 'text',
					category: `Signer ${signerNum}`,
					...baseProps
				},
				{
					_id: `signer_${signerNum}_email`,
					name: `signer_${signerNum}_email`,
					displayName: `Signer ${signerNum} Email`,
					type: 'text',
					category: `Signer ${signerNum}`,
					...baseProps
				},
				{
					_id: `signer_${signerNum}_role`,
					name: `signer_${signerNum}_role`,
					displayName: `Signer ${signerNum} Role`,
					type: 'text',
					category: `Signer ${signerNum}`,
					...baseProps
				}
			);
		}
	}

	// 5. Merge with precedence: document > user > signers > system
	const variableMap = new Map<string, GlobalVariable>();

	for (const v of systemVars) {
		variableMap.set(v.name, v);
	}
	for (const v of signerVars) {
		variableMap.set(v.name, v);
	}
	for (const v of userVars) {
		variableMap.set(v.name, v);
	}
	for (const v of docVars) {
		variableMap.set(v.name, v);
	}

	return [...variableMap.values()];
}
