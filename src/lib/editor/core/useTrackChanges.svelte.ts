/**
 * useTrackChanges.svelte.ts - Track Changes Convex Integration
 * ════════════════════════════════════════════════════════════════════════════
 * Svelte 5 runes-based service to wire TrackChangesExtension callbacks to Convex.
 */

import { useConvexClient, useConvexQuery, useConvexMutation } from "$lib/convex/hooks";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface UseTrackChangesOptions {
	documentId: Id<"documents">;
	authorName: string;
	authorColor?: string;
}

interface TrackChangeData {
	changeType: "insertion" | "deletion" | "replacement";
	changeId: string;
	originalContent?: string;
	newContent?: string;
	position: number;
	authorName: string;
	authorColor: string;
}

/**
 * Creates a Convex-wired track changes service using Svelte 5 runes
 */
export function useTrackChanges(getOptions: () => UseTrackChangesOptions) {
	const client = useConvexClient();

	// Reactive state for suggest mode
	let suggestModeEnabled = $state(false);

	// Queries - reactive subscriptions to pending changes
	const pendingChangesQuery = useConvexQuery(
		api.documentChanges.queries.listByDocument,
		() => ({ documentId: getOptions().documentId, status: "pending" as const })
	);

	const pendingCountQuery = useConvexQuery(
		api.documentChanges.queries.countPending,
		() => ({ documentId: getOptions().documentId })
	);

	// Derived state from queries
	const pendingChanges = $derived(pendingChangesQuery.data ?? []);
	const pendingCount = $derived(pendingCountQuery.data ?? 0);
	const isLoading = $derived(pendingChangesQuery.isLoading);

	// Callback for TrackChangesExtension - persists changes to Convex
	const onChangeCreated = async (change: TrackChangeData): Promise<void> => {
		try {
			const opts = getOptions();
			await client.mutation(api.documentChanges.mutations.create, {
				documentId: opts.documentId,
				changeType: change.changeType,
				originalContent: change.originalContent,
				newContent: change.newContent,
				position: change.position,
				authorName: change.authorName,
				authorColor: change.authorColor,
				changeId: change.changeId,
			});
		} catch (error) {
			console.error("[TrackChanges] Failed to persist change:", error);
		}
	};

	// Accept a single change by Convex ID
	const accept = async (convexId: Id<"documentChanges">): Promise<{ success: boolean; changeId: string }> => {
		return client.mutation(api.documentChanges.mutations.accept, { id: convexId });
	};

	// Reject a single change by Convex ID
	const reject = async (convexId: Id<"documentChanges">): Promise<{ success: boolean; changeId: string }> => {
		return client.mutation(api.documentChanges.mutations.reject, { id: convexId });
	};

	// Accept all pending changes
	const acceptAll = async (): Promise<{ accepted: number }> => {
		return client.mutation(api.documentChanges.mutations.acceptAll, { documentId: getOptions().documentId });
	};

	// Reject all pending changes
	const rejectAll = async (): Promise<{ rejected: number }> => {
		return client.mutation(api.documentChanges.mutations.rejectAll, { documentId: getOptions().documentId });
	};

	// Toggle suggest mode
	const toggleSuggestMode = (): void => {
		suggestModeEnabled = !suggestModeEnabled;
	};

	// Enable suggest mode
	const enableSuggestMode = (): void => {
		suggestModeEnabled = true;
	};

	// Disable suggest mode
	const disableSuggestMode = (): void => {
		suggestModeEnabled = false;
	};

	// Extension configuration object (pass to createEditorExtensions)
	const extensionConfig = $derived.by(() => {
		const opts = getOptions();
		return {
			enabled: suggestModeEnabled,
			authorName: opts.authorName,
			authorColor: opts.authorColor ?? "#6366f1",
			onChangeCreated,
			onStatusChange: (enabled: boolean) => {
				suggestModeEnabled = enabled;
			},
		};
	});

	return {
		// Reactive state
		get suggestModeEnabled() { return suggestModeEnabled; },
		get pendingChanges() { return pendingChanges; },
		get pendingCount() { return pendingCount; },
		get isLoading() { return isLoading; },
		// Actions
		accept,
		reject,
		acceptAll,
		rejectAll,
		toggleSuggestMode,
		enableSuggestMode,
		disableSuggestMode,
		// Extension config for createEditorExtensions
		get extensionConfig() { return extensionConfig; },
	};
}
