/**
 * Deterministic JSON serialization for hash generation.
 * - Sorts object keys recursively.
 * - Preserves array order.
 * - Rejects non-JSON values by round-tripping through JSON.
 */

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function normalizeJsonValue(value: unknown): JsonValue {
	if (value === null) return null;
	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((item) => normalizeJsonValue(item));
	}

	if (typeof value === 'object') {
		const result: { [key: string]: JsonValue } = {};
		for (const key of Object.keys(value as Record<string, unknown>).sort()) {
			result[key] = normalizeJsonValue((value as Record<string, unknown>)[key]);
		}
		return result;
	}

	return null;
}

/**
 * Remove prototypes/functions/etc and serialize deterministically.
 */
export function stableStringify(value: unknown): string {
	// First pass strips non-JSON values and prototype pollution vectors.
	const plain = JSON.parse(JSON.stringify(value ?? null)) as unknown;
	const normalized = normalizeJsonValue(plain);
	return JSON.stringify(normalized);
}
