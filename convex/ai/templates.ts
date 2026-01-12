// convex/ai/templates.ts
import { v } from 'convex/values';
import { internal } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import { action, internalMutation, internalQuery, query } from '@/convex/_generated/server';
import { generateEmbedding } from '../lib/gemini';

// Genre and category constants for type safety
export const GENRES = {
	music_industry: 'Music Industry',
	freelancing: 'Freelancing',
	business: 'Business',
	legal: 'Legal'
} as const;

export const CATEGORIES = {
	// Music Industry
	record_label_deal: 'Record Label Deal',
	distribution_agreement: 'Distribution Agreement',
	licensing_agreement: 'Licensing Agreement',
	producer_envelope: 'Producer Envelope',
	artist_management: 'Artist Management Agreement',
	// Freelancing
	service_agreement: 'Service Agreement',
	statement_of_work: 'Statement of Work',
	invoice_template: 'Invoice Template',
	project_proposal: 'Project Proposal',
	consulting_agreement: 'Consulting Agreement',
	// Business
	nda: 'Non-Disclosure Agreement',
	employment_envelope: 'Employment Envelope',
	partnership_agreement: 'Partnership Agreement',
	terms_of_service: 'Terms of Service',
	privacy_policy: 'Privacy Policy',
	// Legal
	power_of_attorney: 'Power of Attorney',
	lease_agreement: 'Lease Agreement',
	loan_agreement: 'Loan Agreement',
	will_template: 'Will Template'
} as const;

/**
 * List templates by genre for the AI generator dropdown.
 */
export const listByGenre = query({
	args: {
		genre: v.optional(v.string())
	},
	returns: v.array(
		v.object({
			_id: v.id('aiTemplates'),
			title: v.string(),
			genre: v.string(),
			category: v.string(),
			source: v.string()
		})
	),
	handler: async (ctx, args) => {
		let templates: Doc<'aiTemplates'>[];

		if (args.genre) {
			templates = await ctx.db
				.query('aiTemplates')
				.withIndex('by_genre', (q) => q.eq('genre', args.genre as string))
				.take(50);
		} else {
			templates = await ctx.db.query('aiTemplates').take(50);
		}

		return templates.map((t) => ({
			_id: t._id,
			title: t.title,
			genre: t.genre,
			category: t.category,
			source: t.source
		}));
	}
});

/**
 * Get categories grouped by genre for the UI selector.
 */
export const getCategoriesByGenre = query({
	args: {},
	returns: v.record(
		v.string(),
		v.array(
			v.object({
				id: v.string(),
				name: v.string()
			})
		)
	),
	handler: async (_ctx) => {
		// Return static category mapping for UI
		return {
			music_industry: [
				{ id: 'record_label_deal', name: 'Record Label Deal' },
				{ id: 'distribution_agreement', name: 'Distribution Agreement' },
				{ id: 'licensing_agreement', name: 'Licensing Agreement' },
				{ id: 'producer_envelope', name: 'Producer Envelope' },
				{ id: 'artist_management', name: 'Artist Management Agreement' }
			],
			freelancing: [
				{ id: 'service_agreement', name: 'Service Agreement' },
				{ id: 'statement_of_work', name: 'Statement of Work' },
				{ id: 'invoice_template', name: 'Invoice Template' },
				{ id: 'project_proposal', name: 'Project Proposal' },
				{ id: 'consulting_agreement', name: 'Consulting Agreement' }
			],
			business: [
				{ id: 'nda', name: 'Non-Disclosure Agreement' },
				{ id: 'employment_envelope', name: 'Employment Envelope' },
				{ id: 'partnership_agreement', name: 'Partnership Agreement' },
				{ id: 'terms_of_service', name: 'Terms of Service' },
				{ id: 'privacy_policy', name: 'Privacy Policy' }
			],
			legal: [
				{ id: 'power_of_attorney', name: 'Power of Attorney' },
				{ id: 'lease_agreement', name: 'Lease Agreement' },
				{ id: 'loan_agreement', name: 'Loan Agreement' },
				{ id: 'will_template', name: 'Will Template' }
			]
		};
	}
});

/**
 * Internal helper to fetch templates by IDs
 */
export const getTemplatesByIds = internalQuery({
	args: { ids: v.array(v.id('aiTemplates')) },
	handler: async (ctx, args) => {
		const templates: Doc<'aiTemplates'>[] = [];
		for (const id of args.ids) {
			const template = await ctx.db.get(id);
			if (template) {
				templates.push(template);
			}
		}
		return templates;
	}
});

/**
 * Internal helper to fetch all templates for embedding
 */
export const getAllTemplates = internalQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query('aiTemplates').collect();
	}
});

/**
 * Internal helper to update a template's embedding
 */
export const updateTemplateEmbedding = internalMutation({
	args: {
		id: v.id('aiTemplates'),
		embedding: v.array(v.number())
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, { embedding: args.embedding });
	}
});

/**
 * Action to backfill embeddings for all templates.
 */
export const embedAllTemplates = action({
	args: {},
	handler: async (ctx) => {
		const templates = await ctx.runQuery(internal.ai.templates.getAllTemplates);
		let count = 0;

		for (const template of templates) {
			// Skip if already has a valid non-zero embedding (heuristic)
			if (
				template.embedding &&
				template.embedding.length === 1536 &&
				template.embedding.some((val: number) => val !== 0)
			) {
				continue;
			}

			console.log(`Generating embedding for template: ${template.title}`);

			// Create a rich text representation for embedding
			const textToEmbed = `Title: ${template.title}\nGenre: ${template.genre}\nCategory: ${template.category}\nContent: ${template.content}`;

			const embedding = await generateEmbedding(textToEmbed);

			await ctx.runMutation(internal.ai.templates.updateTemplateEmbedding, {
				id: template._id,
				embedding
			});
			count++;
		}

		return count;
	}
});

/**
 * Search templates by text query using Vector Search (RAG).
 */
export const searchTemplates = action({
	args: {
		query: v.string(),
		genre: v.optional(v.string()),
		category: v.optional(v.string()),
		limit: v.optional(v.number())
	},
	returns: v.array(
		v.object({
			_id: v.id('aiTemplates'),
			title: v.string(),
			genre: v.string(),
			category: v.string(),
			content: v.string(),
			source: v.string(),
			score: v.number()
		})
	),
	handler: async (ctx, args) => {
		const limit = args.limit ?? 3;

		// 1. Generate embedding for the query
		console.log(`Generating embedding for query: "${args.query}"`);
		const embedding = await generateEmbedding(args.query);

		// 2. Perform vector search
		// biome-ignore lint/suspicious/noExplicitAny: Convex vector search filter builder uses a specific internal type
		let filter: ((q: any) => any) | undefined;
		if (args.genre) {
			// biome-ignore lint/suspicious/noExplicitAny: Convex vector search filter builder uses a specific internal type
			filter = (q: any) => q.eq('genre', args.genre);
		} else if (args.category) {
			// biome-ignore lint/suspicious/noExplicitAny: Convex vector search filter builder uses a specific internal type
			filter = (q: any) => q.eq('category', args.category);
		}

		const results = await ctx.vectorSearch('aiTemplates', 'by_embedding', {
			vector: embedding,
			limit,
			filter
		});

		// 3. Fetch full template details
		const templateIds = results.map((r) => r._id);
		const templates = (await ctx.runQuery(internal.ai.templates.getTemplatesByIds, {
			ids: templateIds
		})) as Doc<'aiTemplates'>[];

		// 4. Map results with scores
		return templates.map((t) => {
			const result = results.find((r) => r._id === t._id);
			return {
				_id: t._id,
				title: t.title,
				genre: t.genre,
				category: t.category,
				content: t.content,
				source: t.source as string,
				score: result?._score ?? 0
			};
		});
	}
});

export const getTemplateContent = query({
	args: {
		templateId: v.id('aiTemplates')
	},
	returns: v.union(
		v.object({
			title: v.string(),
			content: v.string(),
			genre: v.string(),
			category: v.string()
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);
		if (!template) { return null; }

		return {
			title: template.title,
			content: template.content,
			genre: template.genre,
			category: template.category
		};
	}
});

export const clearTemplates = internalMutation({
	args: {},
	returns: v.number(),
	handler: async (ctx) => {
		const all = await ctx.db.query('aiTemplates').collect();
		for (const t of all) {
			await ctx.db.delete(t._id);
		}
		return all.length;
	}
});

/**
 * Internal mutation to perform the actual DB writes.
 * Called by the action below after fetching data.
 */
export const internalSeedInsert = internalMutation({
	args: {
		templates: v.array(
			v.object({
				title: v.string(),
				genre: v.string(),
				category: v.string(),
				content: v.string(),
				source: v.union(
					v.literal('accord'),
					v.literal('commonaccord'),
					v.literal('user'),
					v.literal('system')
				)
			})
		)
	},
	handler: async (ctx, args) => {
		// Clear existing templates first
		const existing = await ctx.db.query('aiTemplates').collect();
		for (const t of existing) {
			await ctx.db.delete(t._id);
		}

		const now = Date.now();
		let count = 0;

		for (const t of args.templates) {
			await ctx.db.insert('aiTemplates', {
				title: t.title,
				genre: t.genre,
				category: t.category,
				content: t.content,
				source: t.source,
				embedding: new Array(1536).fill(0), // Placeholder
				createdAt: now
			});
			count++;
		}

		return count;
	}
});

/**
 * Action to seed templates by fetching from GitHub.
 * RAG Context Seeder.
 */
export const seedTemplates = action({
	args: {},
	returns: v.number(),
	handler: async (ctx): Promise<number> => {
		const { ACCORD_TEMPLATES, fetchTemplateContent } = await import('../lib/templates/repository');

		// biome-ignore lint/suspicious/noExplicitAny: Template structure is complex
		const templatesToInsert: Array<{
			title: string;
			genre: string;
			category: string;
			content: string;
			source: 'accord' | 'user' | 'system';
		}> = [];

		// 1. Fetch and Prepare Accord Project Templates
		for (const t of ACCORD_TEMPLATES) {
			console.log(`Fetching Accord template: ${t.title}...`);
			const content = await fetchTemplateContent(t.name);

			if (content) {
				templatesToInsert.push({
					title: `${t.title} (Accord Project)`,
					genre: 'legal',
					category: 'envelope',
					content,
					source: 'accord' as const
				});
			}
		}

		// 2. Add System Templates (Fallback/Custom)
		const systemTemplates = [
			{
				title: '360 Record Label Deal',
				genre: 'music_industry',
				category: 'record_label_deal',
				content: `360 RECORDING AGREEMENT\n\nThis Agreement between [ARTIST NAME] ("Artist") and [LABEL NAME] ("Label").\n\nTERM: [NUMBER] album cycles.\nADVANCE: $[AMOUNT]\nROYALTY: [PERCENTAGE]% of net receipts\nMERCHANDISE: [PERCENTAGE]% of net profits\nTOURING: [PERCENTAGE]% of net touring income\n\nArtist Signature: _______________ Date: ___\nLabel Representative: _______________ Date: ___`,
				source: 'system'
			},
			{
				title: 'Traditional Record Deal',
				genre: 'music_industry',
				category: 'record_label_deal',
				content: "TRADITIONAL RECORDING AGREEMENT\n\nBetween [ARTIST] and [LABEL]\n\nRECORDING COMMITMENT: [NUMBER] albums\nADVANCE: $[AMOUNT] per album\nROYALTY RATE: [PERCENTAGE]% of SRLP\nRECOUPMENT: All advances fully recoupable\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Artist Management Agreement',
				genre: 'music_industry',
				category: 'artist_management',
				content: "ARTIST MANAGEMENT AGREEMENT\n\nArtist: [ARTIST NAME]\nManager: [MANAGER NAME]\n\nTERM: [NUMBER] years\nCOMMISSION: [PERCENTAGE]% of gross earnings\nSCOPE: Recording, touring, merchandise, endorsements\n\nArtist Signature: _______________ Date: ___\nManager Signature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Music Distribution Agreement',
				genre: 'music_industry',
				category: 'distribution_agreement',
				content: "DIGITAL DISTRIBUTION AGREEMENT\n\nLicensor: [ARTIST/LABEL]\nDistributor: [COMPANY]\n\nTERRITORY: Worldwide\nTERM: [NUMBER] years\nDISTRIBUTION FEE: [PERCENTAGE]%\nPAYMENT: Quarterly\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Master License Agreement',
				genre: 'music_industry',
				category: 'licensing_agreement',
				content: `MASTER USE LICENSE\n\nLicensor: [RIGHTS HOLDER]\nLicensee: [COMPANY]\n\nSONG: "[TITLE]" by [ARTIST]\nUSE: [Film/TV/Commercial]\nTERM: [Perpetual/Years]\nFEE: $[AMOUNT]\n\nSignature: _______________ Date: ___`,
				source: 'system'
			},
			{
				title: 'Sync License Agreement',
				genre: 'music_industry',
				category: 'licensing_agreement',
				content: `SYNCHRONIZATION LICENSE\n\nComposition: "[TITLE]"\nPublisher: [PUBLISHER]\nProject: "[PROJECT NAME]"\n\nFEE: $[AMOUNT]\nTERRITORY: [Worldwide/Specific]\nDURATION: [NUMBER] seconds\n\nSignature: _______________ Date: ___`,
				source: 'system'
			},
			{
				title: 'Producer Agreement',
				genre: 'music_industry',
				category: 'producer_envelope',
				content: "MUSIC PRODUCER AGREEMENT\n\nProducer: [NAME]\nArtist: [ARTIST]\n\nPROJECT: [ALBUM/SINGLE]\nFEE: $[AMOUNT] per track\nPOINTS: [NUMBER] points\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Beat Lease Agreement',
				genre: 'music_industry',
				category: 'producer_envelope',
				content: `BEAT LEASE AGREEMENT\n\nProducer: [NAME]\nLessee: [ARTIST]\n\nBEAT: "[TITLE]"\nLICENSE TYPE: [Non-Exclusive/Exclusive]\nFEE: $[AMOUNT]\nSTREAMS: Up to [NUMBER]\n\nSignature: _______________ Date: ___`,
				source: 'system'
			},
			{
				title: 'Band Partnership Agreement',
				genre: 'music_industry',
				category: 'record_label_deal',
				content: `BAND PARTNERSHIP AGREEMENT\n\nMEMBERS:\n1. [NAME] - [ROLE]\n2. [NAME] - [ROLE]\n\nBAND NAME: "[NAME]"\nOWNERSHIP: Equal shares\nDECISIONS: Majority vote\n\nSignatures: _______________ Date: ___`,
				source: 'system'
			},
			{
				title: 'Music Publishing Deal',
				genre: 'music_industry',
				category: 'licensing_agreement',
				content: "MUSIC PUBLISHING AGREEMENT\n\nWriter: [NAME]\nPublisher: [COMPANY]\n\nTERM: [NUMBER] years\nADVANCE: $[AMOUNT]\nSPLIT: [PERCENTAGE]% to Writer\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Live Performance Envelope',
				genre: 'music_industry',
				category: 'artist_management',
				content: "LIVE PERFORMANCE AGREEMENT\n\nArtist: [NAME]\nVenue: [VENUE]\n\nDATE: [DATE]\nGUARANTEE: $[AMOUNT]\nBACKEND: [PERCENTAGE]% after $[AMOUNT]\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Booking Agency Agreement',
				genre: 'music_industry',
				category: 'artist_management',
				content: "BOOKING AGENCY AGREEMENT\n\nArtist: [NAME]\nAgent: [AGENCY]\n\nTERM: [NUMBER] years\nCOMMISSION: [PERCENTAGE]%\nTERRITORY: [Worldwide/Region]\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Sample Clearance License',
				genre: 'music_industry',
				category: 'licensing_agreement',
				content: `SAMPLE CLEARANCE\n\nOriginal: "[SONG]" by [ARTIST]\nNew Work: "[NEW SONG]"\n\nMASTER FEE: $[AMOUNT]\nPUBLISHING: [PERCENTAGE]% ownership\n\nSignature: _______________ Date: ___`,
				source: 'system'
			},
			{
				title: 'Freelance Service Agreement',
				genre: 'freelancing',
				category: 'service_agreement',
				content: "FREELANCE SERVICE AGREEMENT\n\nProvider: [NAME]\nClient: [CLIENT]\n\nSERVICES: [DESCRIPTION]\nRATE: $[AMOUNT]/hour\nTERM: [START] to [END]\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Statement of Work',
				genre: 'freelancing',
				category: 'statement_of_work',
				content: "STATEMENT OF WORK\n\nProject: [NAME]\nClient: [CLIENT]\n\nSCOPE:\n1. [DELIVERABLE 1]\n2. [DELIVERABLE 2]\n\nTIMELINE: [DATES]\nBUDGET: $[AMOUNT]\n\nApproval: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Invoice Template',
				genre: 'freelancing',
				category: 'invoice_template',
				content: "INVOICE #[NUMBER]\n\nFrom: [YOUR NAME]\nTo: [CLIENT]\nDate: [DATE]\nDue: [DUE DATE]\n\nServices:\n[DESCRIPTION] - $[AMOUNT]\n\nTOTAL: $[AMOUNT]\n\nPayment: [METHOD]",
				source: 'system'
			},
			{
				title: 'Project Proposal',
				genre: 'freelancing',
				category: 'project_proposal',
				content: "PROJECT PROPOSAL\n\nPrepared for: [CLIENT]\nBy: [YOUR NAME]\n\nOBJECTIVE: [DESCRIPTION]\nSOLUTION: [APPROACH]\nTIMELINE: [WEEKS]\nINVESTMENT: $[AMOUNT]\n\nAcceptance: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Consulting Agreement',
				genre: 'freelancing',
				category: 'consulting_agreement',
				content: "CONSULTING AGREEMENT\n\nConsultant: [NAME]\nClient: [CLIENT]\n\nSERVICES: [DESCRIPTION]\nRETAINER: $[AMOUNT]/month\nHOURS: [NUMBER]/month\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Web Design Envelope',
				genre: 'freelancing',
				category: 'service_agreement',
				content: "WEB DESIGN ENVELOPE\n\nDesigner: [NAME]\nClient: [CLIENT]\n\nPROJECT: [WEBSITE]\nPAGES: [NUMBER]\nPRICE: $[AMOUNT]\nREVISIONS: [NUMBER] rounds\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Photography Envelope',
				genre: 'freelancing',
				category: 'service_agreement',
				content: "PHOTOGRAPHY ENVELOPE\n\nPhotographer: [NAME]\nClient: [CLIENT]\n\nEVENT: [DESCRIPTION]\nDATE: [DATE]\nDELIVERABLES: [NUMBER] edited images\nFEE: $[AMOUNT]\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Graphic Design Agreement',
				genre: 'freelancing',
				category: 'service_agreement',
				content: "GRAPHIC DESIGN AGREEMENT\n\nDesigner: [NAME]\nClient: [CLIENT]\n\nPROJECT: [DESCRIPTION]\nDELIVERABLES: [LIST]\nPRICE: $[AMOUNT]\nREVISIONS: [NUMBER]\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Copywriting Envelope',
				genre: 'freelancing',
				category: 'service_agreement',
				content: "COPYWRITING AGREEMENT\n\nWriter: [NAME]\nClient: [CLIENT]\n\nCONTENT: [DESCRIPTION]\nWORD COUNT: [NUMBER]\nRATE: $[AMOUNT]/word\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Social Media Management',
				genre: 'freelancing',
				category: 'service_agreement',
				content: "SOCIAL MEDIA MANAGEMENT\n\nManager: [NAME]\nClient: [BRAND]\n\nPLATFORMS: [LIST]\nPOSTS: [NUMBER]/week\nMONTHLY FEE: $[AMOUNT]\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Virtual Assistant Agreement',
				genre: 'freelancing',
				category: 'service_agreement',
				content: "VIRTUAL ASSISTANT AGREEMENT\n\nAssistant: [NAME]\nClient: [CLIENT]\n\nHOURS: [NUMBER]/week\nRATE: $[AMOUNT]/hour\nTASKS: [DESCRIPTION]\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Retainer Agreement',
				genre: 'freelancing',
				category: 'consulting_agreement',
				content: "RETAINER AGREEMENT\n\nProvider: [NAME]\nClient: [CLIENT]\n\nMONTHLY FEE: $[AMOUNT]\nINCLUDED HOURS: [NUMBER]\nOVERAGE: $[AMOUNT]/hour\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Subcontractor Agreement',
				genre: 'freelancing',
				category: 'service_agreement',
				content: "SUBCONTRACTOR AGREEMENT\n\nContractor: [NAME]\nSubcontractor: [NAME]\n\nPROJECT: [DESCRIPTION]\nPAYMENT: $[AMOUNT]\nDEADLINE: [DATE]\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Non-Disclosure Agreement',
				genre: 'business',
				category: 'nda',
				content: "NON-DISCLOSURE AGREEMENT\n\nDisclosing Party: [NAME]\nReceiving Party: [NAME]\n\nPURPOSE: [DESCRIPTION]\nTERM: [NUMBER] years\nGOVERNING LAW: [STATE/COUNTRY]\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Mutual NDA',
				genre: 'business',
				category: 'nda',
				content: "MUTUAL NON-DISCLOSURE AGREEMENT\n\nParty A: [NAME]\nParty B: [NAME]\n\nPURPOSE: [DESCRIPTION]\nCONFIDENTIAL INFO: Includes all business information\nTERM: [NUMBER] years\n\nParty A Signature: _______________ Date: ___\nParty B Signature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Employment Envelope',
				genre: 'business',
				category: 'employment_envelope',
				content: "EMPLOYMENT AGREEMENT\n\nEmployer: [COMPANY]\nEmployee: [NAME]\n\nPOSITION: [TITLE]\nSTART DATE: [DATE]\nSALARY: $[AMOUNT]/year\nBENEFITS: [LIST]\n\nSignatures: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Independent Contractor Agreement',
				genre: 'business',
				category: 'employment_envelope',
				content: "INDEPENDENT CONTRACTOR AGREEMENT\n\nCompany: [NAME]\nContractor: [NAME]\n\nSERVICES: [DESCRIPTION]\nCOMPENSATION: $[AMOUNT]\nTERM: [DATES]\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Partnership Agreement',
				genre: 'business',
				category: 'partnership_agreement',
				content: "PARTNERSHIP AGREEMENT\n\nPartner 1: [NAME] - [PERCENTAGE]%\nPartner 2: [NAME] - [PERCENTAGE]%\n\nBUSINESS: [NAME]\nPURPOSE: [DESCRIPTION]\nCAPITAL: $[AMOUNT] each\n\nSignatures: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'LLC Operating Agreement',
				genre: 'business',
				category: 'partnership_agreement',
				content: "LLC OPERATING AGREEMENT\n\nCOMPANY: [LLC NAME]\nMEMBERS:\n- [NAME]: [PERCENTAGE]%\n- [NAME]: [PERCENTAGE]%\n\nMANAGEMENT: Member-managed\nDISTRIBUTIONS: Pro-rata\n\nSignatures: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Terms of Service',
				genre: 'business',
				category: 'terms_of_service',
				content: "TERMS OF SERVICE\n\nEffective: [DATE]\n\n1. ACCEPTANCE: By using [SERVICE], you agree to these terms.\n2. SERVICES: [DESCRIPTION]\n3. PAYMENT: [TERMS]\n4. TERMINATION: [CONDITIONS]\n5. LIABILITY: Limited to fees paid.",
				source: 'system'
			},
			{
				title: 'Privacy Policy',
				genre: 'business',
				category: 'privacy_policy',
				content: "PRIVACY POLICY\n\nEffective: [DATE]\n\nWe collect:\n- [DATA TYPE 1]\n- [DATA TYPE 2]\n\nWe use data for:\n- [PURPOSE 1]\n- [PURPOSE 2]\n\nContact: [EMAIL]",
				source: 'system'
			},
			{
				title: 'Service Level Agreement',
				genre: 'business',
				category: 'terms_of_service',
				content: "SERVICE LEVEL AGREEMENT\n\nProvider: [COMPANY]\nClient: [CLIENT]\n\nSERVICES: [DESCRIPTION]\nUPTIME: [PERCENTAGE]%\nSUPPORT: [HOURS] response time\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Non-Compete Agreement',
				genre: 'business',
				category: 'employment_envelope',
				content: "NON-COMPETE AGREEMENT\n\nEmployee: [NAME]\nEmployer: [COMPANY]\n\nRESTRICTION: [DESCRIPTION]\nDURATION: [NUMBER] years post-employment\nTERRITORY: [GEOGRAPHIC AREA]\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Equity Vesting Agreement',
				genre: 'business',
				category: 'partnership_agreement',
				content: "EQUITY VESTING AGREEMENT\n\nCompany: [NAME]\nRecipient: [NAME]\n\nSHARES: [NUMBER]\nVESTING: [NUMBER] years, [NUMBER]-month cliff\nACCELERATION: Single-trigger upon [EVENT]\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'SAFE Agreement',
				genre: 'business',
				category: 'partnership_agreement',
				content: "SIMPLE AGREEMENT FOR FUTURE EQUITY\n\nCompany: [NAME]\nInvestor: [NAME]\n\nINVESTMENT: $[AMOUNT]\nVALUATION CAP: $[AMOUNT]\nDISCOUNT: [PERCENTAGE]%\n\nSignatures: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Power of Attorney',
				genre: 'legal',
				category: 'power_of_attorney',
				content: "POWER OF ATTORNEY\n\nPrincipal: [NAME]\nAgent: [NAME]\n\nPOWERS GRANTED:\n- Financial decisions\n- Property management\n- Legal matters\n\nDURATION: [Durable/Limited]\n\nSignature: _______________ Date: ___\nNotary: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Limited Power of Attorney',
				genre: 'legal',
				category: 'power_of_attorney',
				content: "LIMITED POWER OF ATTORNEY\n\nPrincipal: [NAME]\nAgent: [NAME]\n\nLIMITED TO: [SPECIFIC TRANSACTION]\nEXPIRES: [DATE]\n\nSignature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Residential Lease Agreement',
				genre: 'legal',
				category: 'lease_agreement',
				content: "RESIDENTIAL LEASE AGREEMENT\n\nLandlord: [NAME]\nTenant: [NAME]\n\nPROPERTY: [ADDRESS]\nTERM: [MONTHS]\nRENT: $[AMOUNT]/month\nDEPOSIT: $[AMOUNT]\n\nSignatures: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Commercial Lease',
				genre: 'legal',
				category: 'lease_agreement',
				content: "COMMERCIAL LEASE AGREEMENT\n\nLandlord: [NAME]\nTenant: [BUSINESS]\n\nPREMISES: [ADDRESS]\nTERM: [YEARS]\nBASE RENT: $[AMOUNT]/month\nCAM: $[AMOUNT]/month\n\nSignatures: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Personal Loan Agreement',
				genre: 'legal',
				category: 'loan_agreement',
				content: "PERSONAL LOAN AGREEMENT\n\nLender: [NAME]\nBorrower: [NAME]\n\nPRINCIPAL: $[AMOUNT]\nINTEREST: [PERCENTAGE]%\nTERM: [MONTHS]\nPAYMENT: $[AMOUNT]/month\n\nSignatures: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Promissory Note',
				genre: 'legal',
				category: 'loan_agreement',
				content: "PROMISSORY NOTE\n\nBorrower: [NAME]\nLender: [NAME]\n\nPRINCIPAL: $[AMOUNT]\nDUE DATE: [DATE]\nINTEREST: [PERCENTAGE]% per annum\n\nBorrower Signature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Simple Will',
				genre: 'legal',
				category: 'will_template',
				content: "LAST WILL AND TESTAMENT\n\nI, [FULL NAME], declare this my Will.\n\nI revoke all prior Wills.\n\nI appoint [NAME] as Executor.\n\nI bequeath:\n- [ASSET] to [BENEFICIARY]\n- Residue to [BENEFICIARY]\n\nTestator: _______________ Date: ___\nWitness 1: _______________ Date: ___\nWitness 2: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Settlement Agreement',
				genre: 'legal',
				category: 'loan_agreement',
				content: "SETTLEMENT AGREEMENT\n\nParty 1: [NAME]\nParty 2: [NAME]\n\nDISPUTE: [DESCRIPTION]\nSETTLEMENT: $[AMOUNT]\nRELEASE: Full and final\n\nSignatures: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Equipment Lease',
				genre: 'legal',
				category: 'lease_agreement',
				content: "EQUIPMENT LEASE AGREEMENT\n\nLessor: [NAME]\nLessee: [NAME]\n\nEQUIPMENT: [DESCRIPTION]\nTERM: [MONTHS]\nMONTHLY PAYMENT: $[AMOUNT]\n\nSignatures: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Bill of Sale',
				genre: 'legal',
				category: 'loan_agreement',
				content: "BILL OF SALE\n\nSeller: [NAME]\nBuyer: [NAME]\n\nITEM: [DESCRIPTION]\nSALE PRICE: $[AMOUNT]\nCONDITION: As-is\n\nSeller Signature: _______________ Date: ___\nBuyer Signature: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Living Will',
				genre: 'legal',
				category: 'will_template',
				content: "LIVING WILL / ADVANCE DIRECTIVE\n\nI, [FULL NAME], declare:\n\nIf terminally ill or permanently unconscious:\n- [NO/YES] artificial life support\n- [NO/YES] artificial nutrition\n\nHealthcare Agent: [NAME]\n\nSignature: _______________ Date: ___\nWitness: _______________ Date: ___",
				source: 'system'
			},
			{
				title: 'Indemnity Agreement',
				genre: 'legal',
				category: 'power_of_attorney',
				content: "INDEMNITY AGREEMENT\n\nIndemnitor: [NAME]\nIndemnitee: [NAME]\n\nINDEMNITOR agrees to hold INDEMNITEE harmless from:\n[SPECIFIED CLAIMS/LIABILITIES]\n\nSignature: _______________ Date: ___",
				source: 'system'
			}
		];

		// Process system templates to ensure type safety
		const strictSystemTemplates = systemTemplates.map((t) => ({ ...t, source: 'system' as const }));
		templatesToInsert.push(...strictSystemTemplates);

		// Call internal mutation to save
		return await ctx.runMutation(internal.ai.templates.internalSeedInsert, {
			templates: templatesToInsert
		});
	}
});
