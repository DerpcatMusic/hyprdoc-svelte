/**
 * Centralized ID Normalization Utilities
 *
 * Single source of truth for handling ID comparisons across the codebase.
 * Handles: Convex IDs, strings, objects with _id/id properties.
 */

/**
 * Normalize any ID-like value to a consistent string format.
 * @param id - Can be a string, Convex ID, or object with _id/id property
 * @returns Normalized string ID or null if invalid
 */
export const normalizeId = (id: unknown): string | null => {
  if (!id) {
    return null;
  }

  // Already a string
  if (typeof id === "string") {
    return id;
  }

  // Object with _id or id property (common for Convex documents and slot objects)
  if (typeof id === "object" && id !== null) {
    const obj = id as Record<string, unknown>;

    // Check common ID properties and stringify them
    const _id = obj._id;
    if (_id !== undefined && _id !== null) {
      return String(_id);
    }
    const idProp = obj.id;
    if (idProp !== undefined && idProp !== null) {
      return String(idProp);
    }

    // Fallback to String() for other objects (e.g., Convex ID runtime type itself)
    return String(id);
  }

  // Fallback for numbers or other primitives
  return String(id);
};

/**
 * Compare two ID-like values for equality after normalization.
 * @returns true if both normalize to the same non-null string
 */
export const compareIds = (a: unknown, b: unknown): boolean => {
  const normA = normalizeId(a);
  const normB = normalizeId(b);
  return normA !== null && normB !== null && normA === normB;
};

/**
 * Check if an ID value is valid (normalizes to a non-null string).
 */
export const isValidId = (id: unknown): boolean => {
  return normalizeId(id) !== null;
};
