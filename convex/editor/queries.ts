import type { Id, Doc } from '@/convex/_generated/dataModel';
import { type QueryCtx, query } from '@/convex/_generated/server';
import { type Infer, v } from 'convex/values';
import { requireDocumentOwner } from '@/convex/lib/auth';
import { documentReturnValidator } from '../lib/validators';

// ═══════════════════════════════════════════════════════════════
// COMBINED EDITOR DATA QUERY
// Reduces 4+ WebSocket roundtrips to 1 for initial editor load
// ═══════════════════════════════════════════════════════════════

/**
 * Helper to list global variables for a document.
 */
interface GlobalVariable {
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

const SYSTEM_VARIABLES = [
	{ name: 'today', displayName: "Today's Date", type: 'date' as const, category: 'Date' },
	{ name: 'now', displayName: 'Current Time', type: 'text' as const, category: 'Date' },
	{
		name: 'document_title',
		displayName: 'Document Title',
		type: 'text' as const,
		category: 'Document'
	},
	{
		name: 'document_created',
		displayName: 'Document Created',
		type: 'date' as const,
		category: 'Document'
	},
	{ name: 'signer_name', displayName: 'Signer Name', type: 'text' as const, category: 'Signer' },
	{ name: 'signer_email', displayName: 'Signer Email', type: 'text' as const, category: 'Signer' },
	{ name: 'signer_role', displayName: 'Signer Role', type: 'text' as const, category: 'Signer' }
];

async function getGlobalVariablesForDocument(
	ctx: QueryCtx,
	documentId?: Id<'documents'>
): Promise<GlobalVariable[]> {
	const user = await ctx.auth.getUserIdentity();

	// System variables
	const systemVars: GlobalVariable[] = SYSTEM_VARIABLES.map((sv) => ({
		_id: `system_${sv.name}`,
		...sv,
		value: null,
		scope: 'system' as const,
		fallback: '',
		createdAt: 0,
		updatedAt: 0
	}));

	// User variables
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

	// Document variables
	let docVars: GlobalVariable[] = [];
	if (documentId) {
		const docVariables = await ctx.db
			.query('globalVariables')
			.withIndex('by_document', (q) => q.eq('documentId', documentId))
			.collect();

		docVars = docVariables
			.filter((v) => v.scope === 'document')
			.map((v) => ({ ...v, value: v.value ?? null }) as GlobalVariable);
	}

	// Dynamic signer-indexed variables
	const signerVars: GlobalVariable[] = [];
	if (documentId) {
		const signers = await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', documentId))
			.collect();

		for (const [index, signer] of signers.entries()) {
			const signerNum = String(index + 1).padStart(2, '0');
			const baseProps = {
				value: null,
				scope: 'system' as const,
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

	// Merge with precedence: document > user > signers > system
	const variableMap = new Map<string, GlobalVariable>();
	for (const v of systemVars) { variableMap.set(v.name, v); }
	for (const v of signerVars) { variableMap.set(v.name, v); }
	for (const v of userVars) { variableMap.set(v.name, v); }
	for (const v of docVars) { variableMap.set(v.name, v); }

	return [...variableMap.values()];
}

/**
 * Combined query for all editor data.
 * Fetches document, signers, glossary terms, and global variables in one roundtrip.
 */
export const getEditorData = query({
	args: {
		documentId: v.optional(v.id('documents')),
		templateId: v.optional(v.id('documents'))
	},
	handler: async (ctx, args) => {
		// Validate that at least one ID is provided
		if (!(args.documentId || args.templateId)) {
			return null;
		}

		// Fetch document or template
		let document: Infer<typeof documentReturnValidator> | null = null;
		let template: Infer<typeof documentReturnValidator> | null = null;

		if (args.documentId) {
			// Auth check - only owner can access
			try {
				await requireDocumentOwner(ctx, args.documentId);
				document = await ctx.db.get(args.documentId);
			} catch {
				return null; // Not authorized or not found
			}
		}

		if (args.templateId) {
			template = await ctx.db.get(args.templateId);
			// Templates have their own auth logic handled elsewhere
		}

		// Parallel fetch all related data
		const [signers, glossaryTermsRaw, globalVariables] = await Promise.all([
			// Signers (only for documents)
			args.documentId
				? ctx.db
						.query('signers')
						.withIndex('by_document', (q) => q.eq('documentId', args.documentId as Id<'documents'>))
						.collect()
				: Promise.resolve([]),

			// Glossary terms (lightweight - just the strings)
			ctx.db
				.query('glossaryTerms')
				.take(2000),

			// Global variables
			getGlobalVariablesForDocument(ctx, args.documentId)
		]);

		// Map glossary to just term strings for client-side highlighting
		const glossaryTerms = glossaryTermsRaw.map((t) => t.term);

		return {
			document,
			template,
			signers,
			glossaryTerms,
			globalVariables
		};
	}
});
