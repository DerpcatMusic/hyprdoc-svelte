// convex/globalVariables/constants.ts
export const SYSTEM_VARIABLES = [
	{
		name: 'today',
		displayName: "Today's Date",
		type: 'date' as const,
		category: 'Date'
	},
	{
		name: 'now',
		displayName: 'Current Time',
		type: 'text' as const,
		category: 'Date'
	},
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
	{
		name: 'signer_name',
		displayName: 'Signer Name',
		type: 'text' as const,
		category: 'Signer'
	},
	{
		name: 'signer_email',
		displayName: 'Signer Email',
		type: 'text' as const,
		category: 'Signer'
	},
	{
		name: 'signer_role',
		displayName: 'Signer Role',
		type: 'text' as const,
		category: 'Signer'
	}
];
