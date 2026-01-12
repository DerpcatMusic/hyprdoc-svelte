<script lang="ts">
	/**
	 * Editor Page - Main Orchestrator
	 *
	 * Wires up all editor contexts and handles data loading/saving via Convex.
	 * Now optimized with SSR hydration and Runed State Machines.
	 */
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { api } from '@/convex/_generated/api';
	import type { Id } from '@/convex/_generated/dataModel';
	import { useDebounce, FiniteStateMachine } from 'runed';

	import { initEditorContext, setCollaborationState, setDocumentState } from '$lib/editor/core/editor-context';
	import { CollaborationState } from '$lib/editor/core/CollaborationState.svelte';
	import EditorCanvas from '$lib/editor/ui/EditorCanvas.svelte';
	import EditorFormattingBar from '$lib/components/editor/EditorFormattingBar.svelte';
	import EditorTopBar from '$lib/components/editor/EditorTopBar.svelte';
	import EditorSidebar from '$lib/components/editor/sidebar/EditorSidebar.svelte';
	import PropertiesPanel from '$lib/components/editor/properties/PropertiesPanel.svelte';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { PageData } from './$types';

	import { untrack, onDestroy } from 'svelte';

	// ━━━ EXTENSIONS FACTORY (Single Source of Truth) ━━━
	import { createEditorExtensions } from '$lib/editor/core/extensions';
	import { type CursorUser } from '$lib/components/editor/extensions/collaboration-cursor';
	import SlashMenuPortal from '$lib/components/editor/slash-command/SlashMenuPortal.svelte';

	
	let { data }: { data: PageData } = $props();

	// --- 1. ID & Query (SSR Hydrated) ---
	const documentId = $derived(page.params.documentId as Id<'documents'>);

	// Use initialData from server to prevent loading spinner
	const documentQuery = useQuery(api.documents.queries.get.get, () => ({ documentId }), {
		initialData: untrack(() => data.initialDocument)
	});

	const documentData = $derived(documentQuery.data);
	const isLoading = $derived(documentQuery.isLoading);
	const error = $derived(documentQuery.error);

	// --- 2. Context Initialization ---
	// modeState is the new RUNED FSM-based mode manager
	const { engine, documentState, modeState } = initEditorContext();

	
	const convexClient = useConvexClient();
	
	// ━━━ OPTIONAL COLLABORATION (Only when realTimeEnabled) ━━━
	// We defer instantiation until we know document settings
	let collabState = $state<CollaborationState | null>(null);
	let hasInitializedCollab = $state(false);

	$effect(() => {
		// Only create CollaborationState if:
		// 1. Document is loaded (documentData exists)
		// 2. realTimeEnabled is true
		// 3. We're in browser
		// 4. User is authenticated
		const realTimeEnabled = documentData?.settings?.realTimeEnabled ?? false;
		
		if (browser && data.workosId && realTimeEnabled && !hasInitializedCollab) {
			collabState = new CollaborationState(
				convexClient, 
				untrack(() => documentId), 
				data.workosId
			);
			setCollaborationState(collabState);
			collabState.init();
			hasInitializedCollab = true;
		}
	});

	// Sync LOCAL Cursor Position (only if collab active)
	$effect(() => {
		if (collabState && engine.selection) {
			collabState.updateCursor(engine.selection.from, engine.selection.to);
		}
	});

	// Sync REMOTE Cursors (to Editor)
	$effect(() => {
		if (engine.editor && collabState) {
			const users: CursorUser[] = collabState.activeUsers.map(u => ({
				id: u.userId,
				color: u.data?.color || '#888',
				name: u.data?.name || 'User',
				cursor: u.data?.cursor ? { from: u.data.cursor.from, to: u.data.cursor.to } : null
			}));
			
			if (engine.editor.commands.updateCollaborationCursors) {
				engine.editor.commands.updateCollaborationCursors(users);
			}
		}
	});

	onDestroy(() => {
		if (collabState) collabState.destroy();
	});


	// Editor State (Reactive Engine)
	// documentState is already set by initEditorContext()
	
	// ━━━ EXTENSIONS FROM FACTORY (Single Source of Truth) ━━━
	// Factory provides ALL extensions - no manual configuration here
	const editorExtensions = $derived(
		createEditorExtensions({
			mode: 'builder',
			documentState: documentState,
			convexClient: convexClient,
			placeholder: 'Start typing or press "/" for commands...'
		})
	);


	// --- 3. Sync Document Data ---
	$effect(() => {
		documentState.sync(documentData);
	});

	// --- 4. Robust Autosave (Finite State Machine) ---
	type SaveStates = 'idle' | 'waiting' | 'saving' | 'error';
	type SaveEvents = 'CHANGE' | 'TIMEOUT' | 'SUCCESS' | 'FAILURE';

	const saveMachine = new FiniteStateMachine<SaveStates, SaveEvents>('idle', {
		idle: {
			CHANGE: 'waiting'
		},
		waiting: {
			TIMEOUT: 'saving',
			CHANGE: 'waiting' // Reset timer ideally, but debouncer handles this
		},
		saving: {
			SUCCESS: 'idle',
			FAILURE: 'error',
			CHANGE: 'saving' // Queue another save? For now ignore
		},
		error: {
			CHANGE: 'waiting' // Try again on next change
		}
	});

	// Connect FSM state to global state for UI
	$effect(() => {
		documentState.status = saveMachine.current;
	});

	// Debounced trigger for the actual save operation
	const triggerSave = useDebounce(async () => {
		if (saveMachine.current === 'waiting') {
			saveMachine.send('TIMEOUT');
			// Perform save
			await performSave();
		}
	}, 2000);

	async function performSave() {
		if (!browser || !engine.editor || !documentId) return;

		const json = engine.editor.getJSON();
		const contentString = JSON.stringify(json);

		try {
			await convexClient.mutation(api.documents.mutations.update.quickUpdate, {
				documentId,
				content: contentString,
				title: documentState.title
			});
			saveMachine.send('SUCCESS');
			documentState.lastSavedAt = Date.now();
		} catch (err) {
			console.error('[Editor] Save failed:', err);
			saveMachine.send('FAILURE');
		}
	}

	// Watch for editor updates
	$effect(() => {
		if (!engine.isReady || !browser) return;

		const handleUpdate = () => {
			if (saveMachine.current === 'idle' || saveMachine.current === 'error') {
				saveMachine.send('CHANGE');
			}
			triggerSave();
		};

		engine.editor?.on('update', handleUpdate);
		return () => engine.editor?.off('update', handleUpdate);
	});

	// --- 5. Parse Initial Content ---
	const initialContent = $derived.by(() => {
		if (!documentData?.content) return undefined;

		try {
			const parsed = JSON.parse(documentData.content);
			if (parsed && typeof parsed === 'object' && parsed.type) {
				return parsed;
			}
			return { type: 'doc', content: [] };
		} catch {
			return { type: 'doc', content: [] };
		}
	});
</script>

<div class="flex h-screen w-full flex-col overflow-hidden bg-background font-sans text-foreground">
	<!-- TOP BAR -->
	{#if !isLoading && !error}
		<EditorTopBar 
			{documentId}
			bind:title={documentState.title}
			isSaving={saveMachine.current === 'saving'}
			lastSavedAt={documentState.lastSavedAt}
			isSealed={false}
			onSave={performSave}
			onSend={() => {}}
			onExport={(type) => {}}
		/>
	{:else}
		<header
			class="z-50 flex h-12 w-full shrink-0 items-center justify-between border-b bg-background px-4"
		>
			<div class="font-bold">
				{documentState.title}
			</div>
		</header>
	{/if}

	<!-- TOOLBAR -->
	{#if !isLoading && !error}
		<EditorFormattingBar />
	{/if}

	<div class="relative flex flex-1 overflow-hidden">
		<!-- LEFT: Sidebar -->
		{#if !isLoading && !error}
			<div class="pointer-events-none absolute left-0 top-0 z-20 h-full">
				<div class="pointer-events-auto h-full">
					<EditorSidebar />
				</div>
			</div>
		{/if}

		<!-- CENTER: Editor -->
		<div
			class="relative flex h-full w-full flex-1 flex-col items-center overflow-hidden bg-muted/5 p-0"
		>
			{#if isLoading}
				<div class="flex h-full items-center justify-center">
					<Spinner size="lg" />
				</div>
			{:else if error}
				<div class="p-4 text-destructive">Error: {error.toString()}</div>
			{:else}
				<EditorCanvas 
					{initialContent} 
					extensions={editorExtensions} 
				/>
			{/if}
		</div>

		<!-- RIGHT: Sidebar -->
		{#if !isLoading && !error}
			<div class="pointer-events-none absolute right-0 top-0 z-20 h-full">
				<div class="pointer-events-auto h-full">
					<PropertiesPanel />
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Global Slash Menu Portal -->
<SlashMenuPortal />
