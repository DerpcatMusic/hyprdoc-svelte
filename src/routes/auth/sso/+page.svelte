<script lang="ts">
	import { page } from '$app/state';
	import { Spinner } from '$lib/components/ui/spinner';
	import { Building2, KeyRound } from 'lucide-svelte';

	type StartSsoResponse = {
		redirectTo?: string;
		error?: string;
	};

	let email = $state('');
	let connectionId = $state('');
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	const screenHintLabel = $derived(
		page.url.searchParams.get('screen_hint') === 'sign-up' ? 'sign-up' : 'sign-in'
	);

	const returnTo = $derived(normalizeReturnTo(page.url.searchParams.get('returnTo') ?? '/dashboard'));
	const emailFromQuery = $derived(page.url.searchParams.get('email')?.trim() ?? '');
	const connectionFromQuery = $derived(page.url.searchParams.get('connection_id')?.trim() ?? '');

	$effect(() => {
		if (!email && emailFromQuery) {
			email = emailFromQuery;
		}
		if (!connectionId && connectionFromQuery) {
			connectionId = connectionFromQuery;
		}
	});

	function normalizeReturnTo(value: string) {
		if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard';
		return value;
	}

	function isValidEmail(value: string) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
	}

	async function readBody(response: Response): Promise<StartSsoResponse | null> {
		try {
			return (await response.json()) as StartSsoResponse;
		} catch {
			return null;
		}
	}

	async function beginSso() {
		errorMessage = '';

		const normalizedEmail = email.trim().toLowerCase();
		const normalizedConnectionId = connectionId.trim();

		if (normalizedEmail && !isValidEmail(normalizedEmail)) {
			errorMessage = 'Enter a valid work email.';
			return;
		}

		if (!normalizedEmail && !normalizedConnectionId) {
			errorMessage = 'Enter your work email or your WorkOS connection ID.';
			return;
		}

		isSubmitting = true;
		try {
			const response = await fetch('/auth/sso/start', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					email: normalizedEmail || undefined,
					connectionId: normalizedConnectionId || undefined,
					returnTo
				})
			});

			const body = await readBody(response);

			if (!response.ok || !body?.redirectTo) {
				errorMessage = body?.error ?? 'Unable to start SSO.';
				return;
			}

			window.location.href = body.redirectTo;
		} catch {
			errorMessage = 'Unable to start SSO. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>SSO Sign In | HyprDoc</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background p-6">
	<div class="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
		<div class="mb-8 space-y-2 text-center">
			<div class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
				<Building2 size={22} />
			</div>
			<h1 class="font-display text-3xl font-black tracking-tight text-foreground">
				Enterprise SSO
			</h1>
			<p class="text-sm text-muted-foreground">
				{screenHintLabel === 'sign-up'
					? 'Create your account through your organization identity provider.'
					: 'Sign in through your organization identity provider.'}
			</p>
		</div>

		<form
			class="space-y-4"
			onsubmit={(event: SubmitEvent) => {
				event.preventDefault();
				beginSso();
			}}
		>
			<div class="space-y-2">
				<label class="text-xs font-bold uppercase tracking-widest text-muted-foreground" for="work-email">
					Work Email (Recommended)
				</label>
				<input
					id="work-email"
					type="email"
					bind:value={email}
					autocomplete="email"
					placeholder="you@company.com"
					class="w-full rounded-xl border border-input bg-background p-4 font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
				/>
			</div>

			<div class="space-y-2">
				<label class="text-xs font-bold uppercase tracking-widest text-muted-foreground" for="connection-id">
					WorkOS Connection ID (Optional)
				</label>
				<input
					id="connection-id"
					type="text"
					bind:value={connectionId}
					placeholder="conn_..."
					class="w-full rounded-xl border border-input bg-background p-4 font-mono text-sm text-foreground placeholder:font-sans placeholder:text-muted-foreground focus:border-primary focus:outline-none"
				/>
				<p class="text-xs text-muted-foreground">
					If no domain mapping exists, enter the connection ID from your admin.
				</p>
			</div>

			<button
				type="submit"
				disabled={isSubmitting}
				class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-black text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if isSubmitting}
					<Spinner size="sm" />
				{:else}
					<KeyRound size={16} />
					Continue with SSO
				{/if}
			</button>
		</form>

		{#if errorMessage}
			<p class="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
				{errorMessage}
			</p>
		{/if}

		<p class="mt-6 text-center text-sm text-muted-foreground">
			Need another method? <a href="/auth/email" class="font-semibold text-primary hover:underline"
				>Use email code</a
			>
		</p>
	</div>
</div>
