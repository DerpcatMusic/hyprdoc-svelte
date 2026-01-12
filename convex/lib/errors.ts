/**
 * Error Handling Module
 * Centralized error codes and typed error classes for consistent error handling.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Error Codes Enum
// ═══════════════════════════════════════════════════════════════════════════

export const ErrorCode = {
	// Authentication & Authorization
	UNAUTHENTICATED: 'UNAUTHENTICATED',
	UNAUTHORIZED: 'UNAUTHORIZED',
	TOKEN_EXPIRED: 'TOKEN_EXPIRED',
	TOKEN_INVALID: 'TOKEN_INVALID',

	// Document Errors
	DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
	DOCUMENT_SEALED: 'DOCUMENT_SEALED',
	DOCUMENT_VOIDED: 'DOCUMENT_VOIDED',
	DOCUMENT_COMPLETED: 'DOCUMENT_COMPLETED',

	// Signer Errors
	SIGNER_NOT_FOUND: 'SIGNER_NOT_FOUND',
	SIGNER_ALREADY_SIGNED: 'SIGNER_ALREADY_SIGNED',
	SIGNER_DECLINED: 'SIGNER_DECLINED',

	// Verification Errors
	OTP_EXPIRED: 'OTP_EXPIRED',
	OTP_INVALID: 'OTP_INVALID',
	OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
	VERIFICATION_REQUIRED: 'VERIFICATION_REQUIRED',
	CONSENT_REQUIRED: 'CONSENT_REQUIRED',

	// Validation Errors
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	INVALID_INPUT: 'INVALID_INPUT',
	MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

	// Resource Errors
	RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
	RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',

	// Rate Limiting
	RATE_LIMITED: 'RATE_LIMITED',

	// System Errors
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ═══════════════════════════════════════════════════════════════════════════
// Typed Application Error
// ═══════════════════════════════════════════════════════════════════════════

export interface ErrorContext {
	documentId?: string;
	signerId?: string;
	workosId?: string;
	field?: string;
	details?: Record<string, unknown>;
}

/**
 * Custom application error with error code and context.
 * Use this for all business logic errors.
 */
export class AppError extends Error {
	public readonly code: ErrorCodeType;
	public readonly context?: ErrorContext;
	public readonly httpStatus: number;

	constructor(
		code: ErrorCodeType,
		message: string,
		context?: ErrorContext,
		httpStatus = 400
	) {
		super(message);
		this.name = 'AppError';
		this.code = code;
		this.context = context;
		this.httpStatus = httpStatus;

		// Maintain proper stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AppError);
		}
	}

	/**
	 * Convert to JSON-safe object for API responses.
	 */
	toJSON() {
		return {
			error: true,
			code: this.code,
			message: this.message,
			...(this.context && { context: this.context })
		};
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Factory Functions
// ═══════════════════════════════════════════════════════════════════════════

export function notFound(resource: string, id?: string): AppError {
	return new AppError(
		ErrorCode.RESOURCE_NOT_FOUND,
		`${resource} not found${id ? `: ${id}` : ''}`,
		{ details: { resource, id } },
		404
	);
}

export function unauthorized(message = 'Access denied'): AppError {
	return new AppError(ErrorCode.UNAUTHORIZED, message, undefined, 403);
}

export function unauthenticated(message = 'Authentication required'): AppError {
	return new AppError(ErrorCode.UNAUTHENTICATED, message, undefined, 401);
}

export function documentSealed(documentId: string): AppError {
	return new AppError(
		ErrorCode.DOCUMENT_SEALED,
		'Cannot modify a sealed document',
		{ documentId },
		409
	);
}

export function validationError(message: string, field?: string): AppError {
	return new AppError(ErrorCode.VALIDATION_ERROR, message, field ? { field } : undefined, 400);
}

export function signerAlreadySigned(signerId: string): AppError {
	return new AppError(
		ErrorCode.SIGNER_ALREADY_SIGNED,
		'Signer has already signed this document',
		{ signerId },
		409
	);
}

export function otpExpired(): AppError {
	return new AppError(
		ErrorCode.OTP_EXPIRED,
		'Verification code has expired. Please request a new code.',
		undefined,
		400
	);
}

export function otpInvalid(): AppError {
	return new AppError(ErrorCode.OTP_INVALID, 'Invalid verification code', undefined, 400);
}

export function otpMaxAttempts(): AppError {
	return new AppError(
		ErrorCode.OTP_MAX_ATTEMPTS,
		'Too many attempts. Please request a new code.',
		undefined,
		429
	);
}

export function tokenExpired(): AppError {
	return new AppError(ErrorCode.TOKEN_EXPIRED, 'Signing link has expired', undefined, 401);
}

export function tokenInvalid(): AppError {
	return new AppError(ErrorCode.TOKEN_INVALID, 'Invalid signing link', undefined, 401);
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Type Guards
// ═══════════════════════════════════════════════════════════════════════════

export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError;
}

/**
 * Safely extract error message from unknown error.
 */
export function getErrorMessage(error: unknown): string {
	if (isAppError(error)) {
		return error.message;
	}
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	return 'An unknown error occurred';
}

/**
 * Wrap an unknown error with an AppError if it isn't already one.
 */
export function wrapError(error: unknown, fallbackMessage?: string): AppError {
	if (isAppError(error)) {
		return error;
	}
	return new AppError(
		ErrorCode.INTERNAL_ERROR,
		getErrorMessage(error) || fallbackMessage || 'An unknown error occurred',
		{ details: { originalError: String(error) } },
		500
	);
}
