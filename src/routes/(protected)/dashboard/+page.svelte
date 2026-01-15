<script lang="ts">
  import { useConvexClient, useQuery } from "convex-svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import { goto } from "$app/navigation";
  import DashboardHUD from "$lib/components/dashboard/DashboardHUD.svelte";
  import DocumentsList from "$lib/components/dashboard/DocumentsList.svelte";
  import EnvelopeTable from "$lib/components/dashboard/EnvelopeTable.svelte";
  import InstanceDashboard from "$lib/components/dashboard/InstanceDashboard.svelte";
  import { Spinner } from "$lib/components/ui/spinner";
  import { uiStore } from "$lib/stores/ui-store.svelte";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  const { data }: Props = $props();
  const client = useConvexClient();

  // State (using let for bindable values)
  let searchQuery = $state("");
  let statusFilter = $state("all");
  let selectedIds = $state(new SvelteSet<string>());

  // Fetch data
  const templatesQuery = useQuery(api.documents.queries.list.list, {
    kind: "template",
  });
  const envelopesQuery = useQuery(api.documents.queries.list.list, {
    kind: "envelope",
  });

  // Derived
  const allDocuments = $derived([
    ...(templatesQuery.data ?? []),
    ...(envelopesQuery.data ?? []),
  ]);

  const viewingTemplate = $derived(
    uiStore.viewingTemplateId
      ? templatesQuery.data?.find((t: any) => t._id === uiStore.viewingTemplateId)
      : null
  );

  const viewingTemplateEnvelopes = $derived(
    uiStore.viewingTemplateId
      ? (envelopesQuery.data?.filter(
          (e: any) => (e as any).sourceTemplateId === uiStore.viewingTemplateId
        ) ?? [])
      : []
  );

  const filteredDocuments = $derived.by(() => {
    let docs = allDocuments;

    if (statusFilter !== "all") {
      docs = docs.filter((d) => d.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.title?.toLowerCase().includes(q) ||
          d.kind?.toLowerCase().includes(q)
      );
    }

    return docs.sort((a, b) => b._creationTime - a._creationTime);
  });

  const stats = $derived.by(() => {
    return {
      total: allDocuments.length,
      pending: allDocuments.filter((d) => d.status === "pending_signatures")
        .length,
      completed: allDocuments.filter((d) => d.status === "completed").length,
      draft: allDocuments.filter((d) => d.status === "draft").length,
    };
  });

  // Handlers
  async function handleCreate() {
    try {
      const id = await client.mutation(api.documents.mutations.create.create, {
        title: "Untitled Document",
        kind: "template",
      });
      goto(`/editor/${id}`);
    } catch (error) {
      console.error("Failed to create document:", error);
    }
  }

  function handleToggleSelect(id: string) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
  }

  async function handleDelete(e: MouseEvent, id: string) {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        await client.mutation(api.documents.mutations.delete.remove, {
          documentId: id as Id<"documents">,
        });
        selectedIds.delete(id);
      } catch (error) {
        console.error("Failed to delete document:", error);
      }
    }
  }

  function handleDuplicate(e: MouseEvent, id: string) {
    e.stopPropagation();
    // TODO: Implement duplicate mutation
    console.log("Duplicate", id);
  }
</script>

<div class="flex flex-col min-h-screen">
  {#if uiStore.viewingTemplateId && viewingTemplate}
    <main class="flex-1 p-8">
      <InstanceDashboard
        template={viewingTemplate}
        envelopes={viewingTemplateEnvelopes}
        onBack={() => uiStore.viewingTemplateId = null}
      />
    </main>
  {:else}
    <DashboardHUD
      bind:searchQuery
      bind:statusFilter
      stats={stats}
      userName={data.user?.firstName}
    />

    <main class="flex-1 p-8 pt-4">
      {#if templatesQuery.isLoading || envelopesQuery.isLoading}
        <div class="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      {:else}
        {#if uiStore.dashboardView === 'templates'}
          <DocumentsList
            documents={filteredDocuments.filter(d => d.kind === 'template')}
            {searchQuery}
            bind:selectedIds
            onToggleSelect={handleToggleSelect}
            onCreate={handleCreate}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onEdit={(id) => goto(`/editor/${id}`)}
            onViewInstances={(id) => uiStore.viewingTemplateId = id}
          />
        {:else}
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold tracking-tight capitalize">
                {uiStore.dashboardView.replace('-', ' ')}
              </h2>
            </div>

            {#if uiStore.dashboardView === 'envelopes'}
              <EnvelopeTable
                envelopes={filteredDocuments.filter(d => d.kind === 'envelope')}
                onDelete={(id) => client.mutation(api.documents.mutations.delete.remove, { documentId: id as any })}
              />
            {:else if uiStore.dashboardView === 'settings'}
              <div
                class="flex h-64 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-muted-foreground/20 bg-muted/5"
              >
                <span class="i-lucide-settings w-10 h-10 text-muted-foreground/40"></span>
                <p class="text-muted-foreground font-medium">Settings</p>
                <p class="text-muted-foreground/60 text-sm">Coming soon</p>
              </div>
            {:else}
              <div
                class="flex h-64 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-muted-foreground/20 bg-muted/5"
              >
                <span
                  class="i-lucide-construction w-10 h-10 text-muted-foreground/40"
                ></span>
                <p class="text-muted-foreground font-medium">
                  View under construction
                </p>
                <p class="text-muted-foreground/60 text-sm">
                  We're working on the {uiStore.dashboardView} view.
                </p>
              </div>
            {/if}
          </div>
        {/if}
      {/if}
    </main>
  {/if}
</div>
