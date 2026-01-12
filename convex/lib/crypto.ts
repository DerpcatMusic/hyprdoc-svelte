/**
 * Cryptographic utilities for document sealing and tamper detection.
 * Uses Web Crypto API (available in Convex runtime).
 */

/**
 * Generate SHA-256 hash of content for tamper detection.
 */
export async function hashContent(content: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(content);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = [...new Uint8Array(hashBuffer)];
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a chain hash for audit log integrity.
 * Includes previous hash for tamper-evident chain.
 */
export async function generateAuditHash(
	entry: {
		action: string;
		timestamp: number;
		resourceId: string;
		metadata?: unknown;
	},
	previousHash: string | null
): Promise<string> {
	const payload = JSON.stringify({
		...entry,
		previousHash: previousHash || 'GENESIS'
	});
	return hashContent(payload);
}

/**
 * Generate secure random token for signer access.
 */
export function generateAccessToken(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a cryptographically secure 6-digit OTP code.
 * Uses crypto.getRandomValues() for CSPRNG compliance (2025 security standards).
 */
export function generateOtpCode(): string {
	const array = new Uint32Array(1);
	crypto.getRandomValues(array);
	// Modulo to get 6-digit range, then ensure always 6 digits
	const code = (array[0] % 900_000) + 100_000;
	return code.toString();
}

/**
 * Hash signature data for integrity verification.
 */
export async function hashSignature(signatureData: string): Promise<string> {
	return hashContent(signatureData);
}

/**
 * Hash any value for audit trail field integrity.
 * Used to create irrefutable proof of exact value at time of entry.
 */
export async function hashValue(value: unknown): Promise<string> {
	const serialized = JSON.stringify(value ?? null);
	return hashContent(serialized);
}
