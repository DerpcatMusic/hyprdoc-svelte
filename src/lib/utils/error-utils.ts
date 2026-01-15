/**
 * Error Handling Utilities
 *
 * Type-safe utilities for handling unknown errors in catch blocks.
 * Use these instead of `catch (err: any)` for proper type safety.
 *
 * @module lib/utils/error-utils
 */

/**
 * Extract error message from unknown error type.
 * Use in catch blocks: `catch (err: unknown)`
 *
 * @example
 * ```ts
 * try {
 *   await riskyOperation();
 * } catch (err: unknown) {
 *   toast({ title: getErrorMessage(err) });
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const errorObj = error as { message: unknown };
    if (typeof errorObj.message === "string") {
      return errorObj.message;
    }
  }
  return "An unknown error occurred";
}

/**
 * Type guard to check if error has a message property.
 */
export function isErrorWithMessage(
  error: unknown
): error is { message: string } {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if (!("message" in error)) {
    return false;
  }
  const errorObj = error as { message: unknown };
  return typeof errorObj.message === "string";
}

/**
 * Type guard to check if error is an Error instance.
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Extract error code if present (useful for Convex errors).
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }
  return undefined;
}

/**
 * Create a standardized error response object.
 */
export function toErrorResponse(error: unknown): {
  message: string;
  code?: string;
} {
  return {
    message: getErrorMessage(error),
    code: getErrorCode(error),
  };
}
