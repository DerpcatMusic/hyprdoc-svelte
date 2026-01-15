import { browser } from '$app/environment';

interface WorkOSUser {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	profilePictureUrl?: string;
}

class AuthState {
	user = $state<WorkOSUser | null>(null);
	accessToken = $state<string | null>(null);
	isLoading = $state(true);

	get isAuthenticated(): boolean {
		return !!this.user;
	}

	setAuth(user: WorkOSUser | null, token: string | null) {
		this.user = user;
		this.accessToken = token;
		this.isLoading = false;
	}

	clear() {
		this.user = null;
		this.accessToken = null;
	}
}

export const authState = new AuthState();
