<script lang="ts">
  /**
   * CommentsPanel - Thread Management Sidebar
   * ════════════════════════════════════════════════════════════════════════════
   * Display comment threads with hover-highlight support and inline replies.
   * Svelte 5 Runes + RUNED + convex-svelte.
   */
  import { Debounced } from "runed";
  import { useConvexClient, useQuery } from "convex-svelte";
  import {
    Check,
    ChevronDown,
    ChevronRight,
    Loader2,
    MessageCircle,
    Plus,
    Reply,
    Search,
    Trash2,
    X,
  } from "lucide-svelte";
  import { slide, fade } from "svelte/transition";
  import { api } from "@/convex/_generated/api";
  import type { Id, Doc } from "@/convex/_generated/dataModel";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { TRACK_CHANGE_COLORS } from "$lib/styles/ui-palette";
  import { cn } from "$lib/utils";
  import { useEditorContext } from "$lib/editor/core/editor-context";

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PROPS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  interface Props {
    documentId?: Id<"documents">;
    authorName?: string;
    authorColor?: string;
    onHighlightThread?: (threadId: Id<"commentThreads"> | null) => void;
    onSelectThread?: (threadId: Id<"commentThreads"> | null) => void;
  }

  let {
    documentId: propDocumentId,
    authorName = "User",
    authorColor = TRACK_CHANGE_COLORS.author,
    onHighlightThread,
    onSelectThread,
  }: Props = $props();

  // Get documentId from context if not provided
  const brain = useEditorContext();
  const documentId = $derived(propDocumentId ?? brain.documentId as Id<"documents">);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TYPES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  type Comment = Doc<"comments">;
  type CommentThread = Doc<"commentThreads"> & {
    comments: Comment[];
    commentCount: number;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const convex = useConvexClient();

  // Search
  let searchValue = $state("");
  const debouncedSearch = new Debounced(() => searchValue, 200);

  // UI state
  let showResolved = $state(false);
  let expandedThreadId = $state<Id<"commentThreads"> | null>(null);
  let replyingToId = $state<Id<"commentThreads"> | null>(null);
  let replyContent = $state("");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUERIES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const threadsQuery = useQuery(
    api.comments.queries.listThreadsWithComments,
    () => ({ documentId, includeResolved: showResolved })
  );

  const threads = $derived((threadsQuery.data ?? []) as CommentThread[]);

  // Filter by search
  const filteredThreads = $derived.by(() => {
    if (!debouncedSearch.current) return threads;
    const query = debouncedSearch.current.toLowerCase();
    return threads.filter((t) =>
      t.anchorText?.toLowerCase().includes(query) ||
      t.comments.some((c) => c.content.toLowerCase().includes(query))
    );
  });

  const unresolvedCount = $derived(threads.filter((t) => !t.isResolved).length);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HANDLERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function handleMouseEnter(threadId: Id<"commentThreads">) {
    onHighlightThread?.(threadId);
  }

  function handleMouseLeave() {
    onHighlightThread?.(null);
  }

  function handleThreadClick(threadId: Id<"commentThreads">) {
    expandedThreadId = expandedThreadId === threadId ? null : threadId;
    onSelectThread?.(expandedThreadId);
  }

  async function handleResolve(threadId: Id<"commentThreads">) {
    try {
      await convex.mutation(api.comments.mutations.resolveThread, { threadId });
    } catch (e) {
      console.error("Failed to resolve thread:", e);
    }
  }

  async function handleReopen(threadId: Id<"commentThreads">) {
    try {
      await convex.mutation(api.comments.mutations.reopenThread, { threadId });
    } catch (e) {
      console.error("Failed to reopen thread:", e);
    }
  }

  async function handleDelete(threadId: Id<"commentThreads">) {
    try {
      await convex.mutation(api.comments.mutations.deleteThread, { threadId });
      expandedThreadId = null;
    } catch (e) {
      console.error("Failed to delete thread:", e);
    }
  }

  async function handleAddReply() {
    if (!replyingToId || !replyContent.trim()) return;
    try {
      await convex.mutation(api.comments.mutations.addComment, {
        threadId: replyingToId,
        content: replyContent.trim(),
        authorName,
        authorColor,
      });
      replyContent = "";
      replyingToId = null;
    } catch (e) {
      console.error("Failed to add reply:", e);
    }
  }

  function formatTime(timestamp: number): string {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
</script>

<div class="flex h-full w-full flex-col font-sans bg-card">
  <div class="sticky top-0 z-20 flex flex-col gap-3 border-b border-border/40 bg-gradient-to-b from-card to-muted/20 px-3 py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Conversation</p>
          <h2 class="font-semibold text-foreground text-sm">Comments</h2>
        </div>
        {#if unresolvedCount > 0}
          <span class="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
            {unresolvedCount}
          </span>
        {/if}
      </div>
      <Button
        size="sm"
        variant={showResolved ? "secondary" : "ghost"}
        class="h-7 rounded-md border border-transparent px-2 text-[10px] hover:border-border/60"
        onclick={() => (showResolved = !showResolved)}
      >
        {showResolved ? "Hide" : "Show"} Resolved
      </Button>
    </div>

    <!-- Search -->
    <div class="relative">
      <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
      <Input
        bind:value={searchValue}
        placeholder="Search comments..."
        class="h-8 border-border/50 bg-background/80 pl-8 text-xs focus-visible:border-primary/30"
      />
    </div>
  </div>

  <ScrollArea class="flex-1">
    <div class="space-y-2 p-2 pb-20">
      {#if threadsQuery.isLoading}
        <div class="flex justify-center p-8">
          <Loader2 class="size-5 animate-spin text-muted-foreground" />
        </div>
      {:else if filteredThreads.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-muted-foreground/40">
          <MessageCircle class="size-8 mb-2 opacity-20" />
          <p class="text-xs">No comments yet</p>
          <p class="text-[10px] mt-1">Select text to add a comment</p>
        </div>
      {:else}
        {#each filteredThreads as thread (thread._id)}
          {@const isExpanded = expandedThreadId === thread._id}
          {@const firstComment = thread.comments[0]}

          <div
            class={cn(
              "rounded-xl border border-border/40 bg-card/70 transition-all",
              thread.isResolved ? "opacity-60" : "",
              isExpanded ? "border-primary/30 bg-muted/30" : "hover:border-border/70 hover:bg-muted/20"
            )}
            onmouseenter={() => handleMouseEnter(thread._id)}
            onmouseleave={() => handleMouseLeave()}
            role="button"
            tabindex="0"
            onkeydown={(e: KeyboardEvent) => e.key === "Enter" && handleThreadClick(thread._id)}
          >
            <!-- Thread Header -->
            <button
              class="w-full rounded-xl px-3 py-2.5 text-left"
              onclick={() => handleThreadClick(thread._id)}
            >
              <div class="flex items-start gap-2">
                <!-- Expand Icon -->
                <div class="mt-0.5 text-muted-foreground">
                  {#if isExpanded}
                    <ChevronDown class="size-3.5" />
                  {:else}
                    <ChevronRight class="size-3.5" />
                  {/if}
                </div>

                <div class="flex-1 min-w-0">
                  <!-- Anchor Text Preview -->
                  {#if thread.anchorText}
                    <p class="text-[10px] text-muted-foreground font-mono truncate mb-1 bg-amber-500/10 px-1 rounded">
                      "{thread.anchorText}"
                    </p>
                  {/if}

                  <!-- First Comment Preview -->
                  {#if firstComment}
                    <div class="flex items-center gap-1.5 mb-0.5">
                      <span
                        class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style="background-color: {firstComment.authorColor || TRACK_CHANGE_COLORS.author}"
                      ></span>
                      <span class="text-xs font-medium text-foreground truncate">{firstComment.authorName}</span>
                      <span class="text-[10px] text-muted-foreground">{formatTime(firstComment.createdAt)}</span>
                    </div>
                    <p class="text-[11px] text-muted-foreground line-clamp-2">{firstComment.content}</p>
                  {/if}

                  <!-- Reply count -->
                  {#if thread.commentCount > 1}
                    <p class="text-[10px] text-primary mt-1">{thread.commentCount - 1} {thread.commentCount === 2 ? "reply" : "replies"}</p>
                  {/if}
                </div>

                <!-- Resolved Badge -->
                {#if thread.isResolved}
                  <span class="rounded bg-green-500/10 px-1.5 py-0.5 text-[9px] font-medium text-green-600">
                    Resolved
                  </span>
                {/if}
              </div>
            </button>

            <!-- Expanded Content -->
            {#if isExpanded}
              <div transition:slide={{ duration: 150 }} class="rounded-b-xl border-t border-border/20 bg-muted/20 px-3 pb-3">
                <!-- All Comments -->
                <div class="space-y-2 pt-2">
                  {#each thread.comments as comment (comment._id)}
                    <div class="flex gap-2">
                      <span
                        class="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style="background-color: {comment.authorColor || TRACK_CHANGE_COLORS.author}"
                      ></span>
                      <div class="flex-1">
                        <div class="flex items-center gap-1.5">
                          <span class="text-[11px] font-medium">{comment.authorName}</span>
                          <span class="text-[9px] text-muted-foreground">{formatTime(comment.createdAt)}</span>
                          {#if comment.editedAt}
                            <span class="text-[9px] text-muted-foreground italic">(edited)</span>
                          {/if}
                        </div>
                        <p class="text-[11px] text-muted-foreground mt-0.5">{comment.content}</p>
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- Reply Input -->
                {#if replyingToId === thread._id}
                  <div transition:slide={{ duration: 100 }} class="mt-3 space-y-2">
                    <textarea
                      bind:value={replyContent}
                      placeholder="Write a reply..."
                      class="w-full min-h-[60px] rounded-md border border-input bg-background px-2 py-1.5 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      onkeydown={(e: KeyboardEvent) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleAddReply();
                        if (e.key === "Escape") replyingToId = null;
                      }}
                    ></textarea>
                    <div class="flex gap-1">
                      <Button size="sm" class="h-6 text-[10px] flex-1" onclick={handleAddReply} disabled={!replyContent.trim()}>
                        Reply
                      </Button>
                      <Button size="sm" variant="ghost" class="h-6 text-[10px]" onclick={() => (replyingToId = null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                {/if}

                <!-- Actions -->
                <div class="flex items-center gap-1 mt-3 pt-2 border-t border-border/20">
                  <Button
                    size="sm"
                    variant="ghost"
                    class="h-6 text-[10px] px-2"
                    onclick={() => (replyingToId = thread._id)}
                  >
                    <Reply class="size-3 mr-1" />
                    Reply
                  </Button>

                  {#if thread.isResolved}
                    <Button
                      size="sm"
                      variant="ghost"
                      class="h-6 text-[10px] px-2"
                      onclick={() => handleReopen(thread._id)}
                    >
                      Reopen
                    </Button>
                  {:else}
                    <Button
                      size="sm"
                      variant="ghost"
                      class="h-6 text-[10px] px-2 text-green-600"
                      onclick={() => handleResolve(thread._id)}
                    >
                      <Check class="size-3 mr-1" />
                      Resolve
                    </Button>
                  {/if}

                  <Button
                    size="sm"
                    variant="ghost"
                    class="h-6 text-[10px] px-2 text-destructive ml-auto"
                    onclick={() => handleDelete(thread._id)}
                  >
                    <Trash2 class="size-3" />
                  </Button>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </ScrollArea>
</div>
