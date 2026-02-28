<script lang="ts">
	import { Fingerprint, Mail, Shield } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Passkey Sign In | HyprDoc</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background p-6">
	<div class="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
		<div class="mb-6 space-y-2 text-center">
			<div class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
				<Fingerprint size={22} />
			</div>
			<h1 class="font-display text-3xl font-black tracking-tight text-foreground">Passkey Sign In</h1>
			<p class="text-sm text-muted-foreground">
				Passkey auth is not enabled in the custom first-party flow yet.
			</p>
		</div>

		<div class="space-y-3">
			<a
				href="/auth/email"
				class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-black text-primary-foreground transition-all hover:opacity-90"
			>
				<Mail size={16} />
				Use Email Code
			</a>
			<a
				href="/auth/sso"
				class="inline-flex w-full items-center justify-center gap-2 rounded-full border border-input bg-background py-3 text-sm font-bold text-foreground transition-all hover:bg-muted"
			>
				<Shield size={16} />
				Use Enterprise SSO
			</a>
		</div>
	</div>
</div>
