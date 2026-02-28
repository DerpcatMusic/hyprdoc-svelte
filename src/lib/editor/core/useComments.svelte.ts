/**
 * useComments.svelte.ts - Comments Convex Integration
 * ════════════════════════════════════════════════════════════════════════════
 * Svelte 5 runes-based service for comment threads and sidepanel.
 */

import { useConvexClient, useConvexQuery } from "$lib/convex/hooks";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";

interface UseCommentsOptions {
	documentId: Id<"documents">;
	authorName: string;
	authorColor?: string;
}

type CommentThread = Doc<"commentThreads"> & {
	comments: Doc<"comments">[];
	commentCount: number;
};

/**
 * Creates a Convex-wired comments service using Svelte 5 runes
 */
export function useComments(options: UseCommentsOptions) {
	const { documentId, authorName, authorColor = "#6366f1" } = options;
	const client = useConvexClient();

	// Reactive state for UI
	let highlightedThreadId = $state<Id<"commentThreads"> | null>(null);
	let selectedThreadId = $state<Id<"commentThreads"> | null>(null);
	let showResolved = $state(false);

	// Query - list threads with comments
	const threadsQuery = useConvexQuery(
		api.comments.queries.listThreadsWithComments,
		() => ({ documentId, includeResolved: showResolved })
	);

	// Query - unresolved count for badge
	const unresolvedCountQuery = useConvexQuery(
		api.comments.queries.countUnresolved,
		() => ({ documentId })
	);

	// Derived state
	const threads = $derived((threadsQuery.data ?? []) as CommentThread[]);
	const unresolvedCount = $derived(unresolvedCountQuery.data ?? 0);
	const isLoading = $derived(threadsQuery.isLoading);

	// Get thread by ID from cached threads
	const getThread = (threadId: Id<"commentThreads">): CommentThread | undefined => {
		return threads.find((t) => t._id === threadId);
	};

	// Highlight a thread (for hover effects in sidebar)
	const highlightThread = (threadId: Id<"commentThreads"> | null): void => {
		highlightedThreadId = threadId;
	};

	// Select a thread (for opening details)
	const selectThread = (threadId: Id<"commentThreads"> | null): void => {
		selectedThreadId = threadId;
	};

	// Create a new thread with initial comment
	const createThread = async (
		anchorFrom: number,
		anchorTo: number,
		content: string,
		anchorText?: string
	): Promise<Id<"commentThreads">> => {
		const threadId = await client.mutation(api.comments.mutations.createThread, {
			documentId,
			anchorFrom,
			anchorTo,
			anchorText,
			initialComment: content,
			authorName,
			authorColor,
		});
		return threadId;
	};

	// Add a comment to existing thread
	const addComment = async (
		threadId: Id<"commentThreads">,
		content: string
	): Promise<Id<"comments">> => {
		return client.mutation(api.comments.mutations.addComment, {
			threadId,
			content,
			authorName,
			authorColor,
		});
	};

	// Resolve a thread
	const resolveThread = async (threadId: Id<"commentThreads">): Promise<void> => {
		await client.mutation(api.comments.mutations.resolveThread, { threadId });
	};

	// Reopen a resolved thread
	const reopenThread = async (threadId: Id<"commentThreads">): Promise<void> => {
		await client.mutation(api.comments.mutations.reopenThread, { threadId });
	};

	// Delete a thread
	const deleteThread = async (threadId: Id<"commentThreads">): Promise<void> => {
		await client.mutation(api.comments.mutations.deleteThread, { threadId });
	};

	// Edit a comment
	const editComment = async (
		commentId: Id<"comments">,
		content: string
	): Promise<void> => {
		await client.mutation(api.comments.mutations.editComment, { commentId, content });
	};

	// Delete a comment
	const deleteComment = async (commentId: Id<"comments">): Promise<void> => {
		await client.mutation(api.comments.mutations.deleteComment, { commentId });
	};

	// Toggle show resolved
	const toggleShowResolved = (): void => {
		showResolved = !showResolved;
	};

	return {
		// Reactive state
		get threads() { return threads; },
		get unresolvedCount() { return unresolvedCount; },
		get isLoading() { return isLoading; },
		get highlightedThreadId() { return highlightedThreadId; },
		get selectedThreadId() { return selectedThreadId; },
		get showResolved() { return showResolved; },
		// Getters
		getThread,
		// Actions
		highlightThread,
		selectThread,
		createThread,
		addComment,
		resolveThread,
		reopenThread,
		deleteThread,
		editComment,
		deleteComment,
		toggleShowResolved,
	};
}
