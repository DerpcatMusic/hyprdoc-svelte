<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { api } from '@/convex/_generated/api';
	import type { Id } from '@/convex/_generated/dataModel';

	interface Props {
		documentId: Id<'documents'>;
	}

	const { documentId }: Props = $props();

	const collaboratorsQuery = useQuery(api.documents.sharing.getCollaborators, () => ({
		documentId
	}));

	const collaborators = $derived(collaboratorsQuery.data);

	const allPeepz = $derived.by(() => {
		if (!collaborators) { return []; }
		return [
			...(collaborators.owner ? [collaborators.owner] : []),
			...collaborators.members
				.filter((m: any) => m.status === 'active')
				.map((m: any) => ({
					...m.user,
					email: m.email,
					fallback: m.user?.name?.[0] || m.email[0].toUpperCase(),
					_id: m.workosId || m._id
				}))
		];
	});
</script>

<div class="mr-2 flex items-center -space-x-2">
	<Tooltip.Provider>
		{#each allPeepz.slice(0, 5) as person, i (person._id || i)}
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Avatar.Root
							class="h-8 w-8 cursor-default border-2 border-background ring-2 ring-transparent transition-transform hover:z-10 hover:scale-105"
							{...props}
						>
							<Avatar.Image src={person.imageUrl} alt={person.name || person.email} />
							<Avatar.Fallback class="bg-primary/10 text-primary text-xs">
								{person.name?.[0] || person.email?.[0]?.toUpperCase() || '?'}
							</Avatar.Fallback>
						</Avatar.Root>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p class="text-xs">
						{person.name || person.email}
						{i === 0 && collaborators?.owner?.email === person.email ? ' (Owner)' : ''}
					</p>
				</Tooltip.Content>
			</Tooltip.Root>
		{/each}

		{#if allPeepz.length > 5}
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-xs ring-2 ring-transparent"
			>
				+{allPeepz.length - 5}
			</div>
		{/if}
	</Tooltip.Provider>
</div>
