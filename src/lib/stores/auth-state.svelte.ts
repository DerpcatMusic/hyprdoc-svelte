import { getContext, setContext } from 'svelte';
import type { Session, User } from '$lib/auth/types';

const AUTH_KEY = Symbol('AUTH');

export class AuthState {
	user = $state<User | null>(null);
	session = $state<Session | null>(null);
	isAuthenticated = $derived(!!this.user);
	isLoading = $state(true);

	constructor(initialSession: Session | null) {
		this.session = initialSession;
		this.user = initialSession?.user ?? null;
		this.isLoading = false;
	}

	setSession(session: Session | null) {
		this.session = session;
		this.user = session?.user ?? null;
	}

	logout() {
		this.session = null;
		this.user = null;
	}
}

export function setAuthState(initialSession: Session | null) {
	const authState = new AuthState(initialSession);
	setContext(AUTH_KEY, authState);
	return authState;
}

export function useAuth() {
	return getContext<AuthState>(AUTH_KEY);
}
