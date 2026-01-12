import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { ConvexClient } from 'convex/browser';
import { untrack } from 'svelte';
import { Throttled } from 'runed';

export interface PresenceUser {
	userId: string; // workosId
	online: boolean;
	lastDisconnected?: number;
	data?: {
		cursor?: { from: number; to: number };
		name?: string;
		color?: string;
	} | any;
}

const HEARTBEAT_INTERVAL = 20000; // 20 seconds
const CURSOR_THROTTLE = 80; // 80ms

export class CollaborationState {
	// ━━━ STATE ━━━
	presence = $state<PresenceUser[]>([]);
	isConnected = $state(false);
	
	// Local cursor state
	myCursor = $state<{ from: number; to: number } | null>(null);

	// ━━━ INTERNAL ━━━
	#client: ConvexClient;
	#documentId: string;
	#workosId: string;
	#sessionId: string;
	#roomId: string;
	#heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	#unsubscribeQuery: (() => void) | null = null;
	#roomToken: string | null = null;

	constructor(client: ConvexClient, documentId: string, workosId: string) {
		this.#client = client;
		this.#documentId = documentId;
		this.#workosId = workosId;
		this.#roomId = `doc:${documentId}`;
		this.#roomId = `doc:${documentId}`;
		this.#sessionId = crypto.randomUUID();
	}

	init() {
		if (this.#heartbeatTimer) return; // Already running
		this.#start();
	}

	// ━━━ PUBLIC API ━━━
	destroy() {
		this.#stopHeartbeat();
		if (this.#unsubscribeQuery) {
			this.#unsubscribeQuery();
			this.#unsubscribeQuery = null;
		}
	}

	/**
	 * Update local cursor and broadcast to others (throttled)
	 */
	updateCursor(from: number, to: number) {
		this.myCursor = { from, to };
		
		// Send if we have a token
		if (this.#roomToken) {
			// Throttled in effect or explicit throttler?
			// Runed Throttled is for VALUES. For function calls, we use logic.
			// Or we just update a Throttled value and watch it.
		}
	}
	
	// Reactive throttler watcher
	#cursorSender = new Throttled(() => this.myCursor, CURSOR_THROTTLE);

	// Effect to send cursor updates
	_sender = $effect.root(() => {
		$effect(() => {
			const cursor = this.#cursorSender.current;
			if (cursor && this.#roomToken) {
				// Fire and forget
				this.#client.mutation(api.documents.presence.update, {
					roomToken: this.#roomToken,
					data: { cursor }
				}).catch(() => {});
			}
		});
	});

	get activeUsers() {
		const unique = new Map<string, PresenceUser>();
		for (const p of this.presence) {
			if (!unique.has(p.userId)) {
				// Assign color if missing
				if (!p.data) p.data = {};
				if (!p.data.color) p.data.color = this.#generateColor(p.userId);
				unique.set(p.userId, p);
			}
		}
		return Array.from(unique.values()).filter(u => u.userId !== this.#workosId);
	}

	#generateColor(id: string): string {
		const colors = [
			'#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6',
			'#14b8a6', '#f43f5e', '#0ea5e9', '#d946ef', '#84cc16'
		];
		let hash = 0;
		for (const char of id) hash = char.charCodeAt(0) + ((hash << 5) - hash);
		return colors[Math.abs(hash) % colors.length];
	}

	// ━━━ INTERNAL LOGIC ━━━
	async #start() {
		await this.#sendHeartbeat();
		this.#startHeartbeatLoop();
	}

	async #sendHeartbeat() {
		try {
			const result = await this.#client.mutation(api.documents.presence.heartbeat, {
				roomId: this.#roomId,
				workosId: this.#workosId,
				sessionId: this.#sessionId,
				interval: HEARTBEAT_INTERVAL,
				data: { cursor: this.myCursor } // Send current state on heartbeat too
			});

			this.isConnected = true;
			this.#roomToken = result.roomToken;

			if (!this.#unsubscribeQuery && this.#roomToken) {
				this.#subscribeToPresence(this.#roomToken);
			}
		} catch (e) {
			console.error('[Collab] Heartbeat failed:', e);
			this.isConnected = false;
		}
	}

	#subscribeToPresence(roomToken: string) {
		this.#unsubscribeQuery = this.#client.onUpdate(
			api.documents.presence.list,
			{ roomToken },
			(updatedPresence) => {
				this.presence = (updatedPresence as PresenceUser[]) || [];
			}
		);
	}

	#startHeartbeatLoop() {
		this.#stopHeartbeat();
		this.#heartbeatTimer = setInterval(() => {
			this.#sendHeartbeat();
		}, HEARTBEAT_INTERVAL);
	}

	#stopHeartbeat() {
		if (this.#heartbeatTimer) {
			clearInterval(this.#heartbeatTimer);
			this.#heartbeatTimer = null;
		}
	}
}
