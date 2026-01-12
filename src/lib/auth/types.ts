import type { WorkOS } from '@workos-inc/node';

export interface User {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	profilePictureUrl: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Session {
	user: User;
	sessionId: string;
	organizationId?: string;
	role?: string;
	permissions?: string[];
	accessToken: string;
}

export interface AuthState {
	isAuthenticated: boolean;
	isLoading: boolean;
	user: User | null;
	session: Session | null;
}

export type WorkOSInstance = InstanceType<typeof WorkOS>;
