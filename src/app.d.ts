// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: import("$lib/auth/session.server").Session | null;
			user: import("$lib/auth/session.server").User | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module 'svelte/elements' {
	export interface HTMLAttributes<T> {
		[key: string]: any;
	}
}

export {};
