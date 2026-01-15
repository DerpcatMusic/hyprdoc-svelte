<script lang="ts">
  import { formatDistanceToNow } from "date-fns";
  import { fade, scale } from "svelte/transition";
  import type { Doc, Id } from "@/convex/_generated/dataModel";
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from "$lib/components/ui/avatar";
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "$lib/components/ui/tooltip";
  import DocumentViewer from "$lib/editor/ui/DocumentViewer.svelte";
  import { cn } from "$lib/utils";

  interface Props {
    document: Doc<"documents"> & {
      instanceStats?: { completed: number; pending: number; draft: number };
      owner?: { name: string; email: string; imageUrl: string };
      currentUserRole?: string;
      slots?: Array<{
        _id: Id<"slots">;
        name: string;
        color: string;
        role: string;
      }>;
      signers?: Array<{
        _id: Id<"signers">;
        legalName: string;
        email: string;
        color: string;
        status: string;
        role: string;
        sourceSlotId?: string;
      }>;
    };
    isSelected?: boolean;
    isSelectionMode?: boolean;
    onClick?: () => void;
    onEdit?: (id: Id<"documents">) => void;
    onDelete?: (e: MouseEvent, id: Id<"documents">) => void;
    onDuplicate?: (e: MouseEvent, id: Id<"documents">) => void;
    onToggleSelect?: (id: Id<"documents">) => void;
    onViewInstances?: (id: Id<"documents">) => void;
  }

  const {
    document: doc,
    isSelected = false,
    isSelectionMode = false,
    onClick,
    onEdit,
    onDelete,
    onDuplicate,
    onToggleSelect,
    onViewInstances,
  }: Props = $props();

  let isHovered = $state(false);

  const stats = $derived(
    doc.instanceStats || { completed: 0, pending: 0, draft: 0 }
  );
  const totalEnvelopes = $derived(
    stats.completed + stats.pending + stats.draft
  );

  const effectiveSettings = $derived({
    ...(doc.settings || {}),
    marginVertical: 8,
    marginHorizontal: 8,
  });

  const normalizedSlots = $derived([
    ...(doc.slots || []),
    ...(doc.signers || []),
  ]);
</script>

<div
  role="button"
  tabindex="0"
  class="group perspective-1000 relative aspect-210/297 w-full cursor-pointer"
  onclick={onClick}
  onkeydown={(e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onClick?.();
		}
	}}
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
>
  <!-- Selection Checkbox -->
  {#if isHovered || isSelected || isSelectionMode}
    <button
      type="button"
      transition:scale={{ duration: 150 }}
      onclick={(e: MouseEvent) => {
				e.stopPropagation();
				onToggleSelect?.(doc._id);
			}}
      aria-label={isSelected ? 'Deselect document' : 'Select document'}
      class={cn(
				'absolute -top-2 -right-2 z-50 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background shadow-lg transition-colors',
				isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary'
			)}
    >
      {#if isSelected}
        <span class="i-lucide-check-circle-2 h-4 w-4"></span>
      {/if}
    </button>
  {/if}

  <!-- Stack Layers -->
  <div
    class="absolute top-4 left-4 h-full w-full rotate-3 scale-95 rounded-2xl border border-border/40 bg-card/40 shadow-sm transition-transform duration-500 ease-out group-hover:translate-x-3 group-hover:translate-y-2 group-hover:rotate-6"
  ></div>
  <div
    class="absolute top-2 left-2 h-full w-full rotate-1 scale-[0.98] rounded-2xl border border-border/60 bg-card/60 shadow-md transition-transform duration-500 ease-out group-hover:translate-x-1.5 group-hover:translate-y-1 group-hover:rotate-3"
  ></div>

  <!-- Main Card -->
  <div
    class="ui-card absolute inset-0 flex h-full w-full flex-col overflow-hidden py-0 group-hover:-translate-y-1 group-hover:shadow-premium group-hover:shadow-primary/10 transition-all duration-500 ease-out"
  >
    <!-- Header Overlay -->
    <div
      class="absolute top-0 right-0 left-0 z-30 flex items-center justify-between border-border/20 border-b bg-background/90 px-4 py-3 backdrop-blur-md dark:bg-card/90"
    >
      <div class="flex items-center gap-2 pr-2 overflow-hidden">
        <div
          class="h-1.5 w-1.5 rounded-full bg-primary shrink-0 transition-all group-hover:scale-125 group-hover:shadow-[0_0_8px_var(--primary)]"
        ></div>
        <h3 class="truncate font-bold text-sm text-foreground tracking-tight">
          {doc.title || 'Untitled'}
        </h3>
      </div>

      <div class="flex items-center gap-2">
        {#if doc.currentUserRole && doc.currentUserRole !== 'owner' && doc.owner}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div class="mr-2 flex items-center gap-1.5">
                  <Avatar class="h-5 w-5 border border-blue-400/50">
                    <AvatarImage
                      src={doc.owner.imageUrl}
                      alt={doc.owner.name}
                    />
                    <AvatarFallback
                      class="bg-blue-500/20 text-[8px] text-blue-200"
                    >
                      {doc.owner.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    class="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-200"
                  >
                    <span class="i-lucide-users w-2.5 h-2.5"></span>
                    <span class="capitalize">{doc.currentUserRole}</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" class="text-xs">
                <p class="font-medium">{doc.owner.name}</p>
                <p class="text-muted-foreground">{doc.owner.email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        {/if}

        {#if isHovered}
          <button
            type="button"
            transition:fade={{ duration: 150 }}
            onclick={(e: MouseEvent) => {
							e.stopPropagation();
							onDelete?.(e, doc._id);
						}}
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-red-500/20"
            aria-label={doc.currentUserRole === 'owner' ? 'Delete' : 'Detach'}
            title={doc.currentUserRole === 'owner' ? 'Delete' : 'Detach'}
          >
            {#if doc.currentUserRole === 'owner'}
              <span
                class="i-lucide-trash-2 w-3.5 h-3.5 text-zinc-400 hover:text-red-500"
              ></span>
            {:else}
              <span
                class="i-lucide-unlink-2 w-3.5 h-3.5 text-zinc-400 hover:text-amber-500"
              ></span>
            {/if}
          </button>
        {/if}
      </div>
    </div>

    <!-- Content Preview -->
    <div
      class="absolute inset-0 top-12 bottom-14 overflow-hidden bg-card scrollbar-none hover:overflow-y-auto"
    >
      {#if isHovered && onDuplicate}
        <button
          type="button"
          transition:fade={{ duration: 150 }}
          onclick={(e: MouseEvent) => {
						e.stopPropagation();
						onDuplicate(e, doc._id);
					}}
          aria-label="Duplicate document"
          class="absolute top-2 right-2 z-30 flex h-8 w-8 items-center justify-center rounded-lg border bg-background/90 shadow-md backdrop-blur-sm transition-all hover:scale-110"
        >
          <span class="i-lucide-copy w-4 h-4 text-muted-foreground"></span>
        </button>
      {/if}

      <div
        class="origin-top-left scale-[0.55] w-[182%]"
        style="margin-bottom: -31.5rem;"
      >
        <DocumentViewer
          content={doc.content}
          mode="preview"
          settings={effectiveSettings}
          showBadge={false}
          class="border-none shadow-none ring-0"
        />
      </div>
    </div>

    <!-- Hover Meta -->
    {#if isHovered}
      <div
        transition:fade={{ duration: 150 }}
        class="pointer-events-none absolute inset-x-0 bottom-14 z-30 flex items-center justify-center pb-2"
      >
        <div
          class="flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 py-1 text-[10px] text-zinc-100 backdrop-blur-md"
        >
          <span class="i-lucide-clock w-3 h-3"></span>
          Saved
          {formatDistanceToNow(doc.updatedAt || doc._creationTime, { addSuffix: true })}
        </div>
      </div>
    {/if}

    <!-- Footer Action Bar -->
    <div
      class="absolute inset-x-0 bottom-0 z-40 flex h-14 items-center border-border border-t bg-background/95 backdrop-blur-sm"
    >
      <button
        type="button"
        onclick={(e: MouseEvent) => {
					e.stopPropagation();
					onViewInstances?.(doc._id);
				}}
        class="relative flex h-full flex-1 items-center justify-center gap-2 transition-colors hover:bg-muted/50"
      >
        <span class="i-lucide-eye w-3.5 h-3.5 text-muted-foreground"></span>
        <span class="font-medium text-xs">Envelopes</span>

        {#if totalEnvelopes > 0}
          <div class="ml-1 flex items-center gap-2">
            {#if isHovered}
              {#if stats.completed > 0}
                <div class="flex items-center gap-0.5">
                  <div class="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                  <span class="font-bold text-[10px] text-emerald-600"
                    >{stats.completed}</span
                  >
                </div>
              {/if}
              {#if stats.pending > 0}
                <div class="flex items-center gap-0.5">
                  <div class="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
                  <span class="font-bold text-[10px] text-amber-600"
                    >{stats.pending}</span
                  >
                </div>
              {/if}
            {:else}
              <span class="text-[10px] text-muted-foreground"
                >{totalEnvelopes}</span
              >
            {/if}
          </div>
        {/if}
      </button>

      <div class="h-6 w-px bg-border/40"></div>

      <button
        type="button"
        onclick={(e: MouseEvent) => {
					e.stopPropagation();
					onEdit?.(doc._id);
				}}
        class="flex h-full flex-1 items-center justify-center gap-2 font-bold text-primary text-xs transition-all hover:bg-primary/5"
      >
        <span class="i-lucide-edit w-3.5 h-3.5"></span>
        Edit
      </button>
    </div>
  </div>
</div>

<style>
  .perspective-1000 {
    perspective: 1000px;
  }
  /* Hide scrollbar for Chrome, Safari and Opera */
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }

  /* Hide scrollbar for IE, Edge and Firefox */
  .scrollbar-none {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }
</style>
