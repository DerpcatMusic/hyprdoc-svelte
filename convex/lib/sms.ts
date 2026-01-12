'use node';

/**
 * SMS service using Plivo for OTP verification.
 * Documentation: https://www.plivo.com/docs/sms/api/message#send-a-message
 *
 * This module is optional - if Plivo credentials are not configured,
 * it will throw a clear error when called.
 */

interface PlivoResponse {
	message: string;
	message_uuid: string[];
	api_id: string;
}

export interface SendSmsParams {
	to: string; // E.164 format: +1234567890
	message: string;
}

/**
 * Check if Plivo is configured.
 */
export function isPlivoConfigured(): boolean {
	return !!(
		process.env.PLIVO_AUTH_ID &&
		process.env.PLIVO_AUTH_TOKEN &&
		process.env.PLIVO_PHONE_NUMBER
	);
}

export async function sendSms(params: SendSmsParams): Promise<{ messageUuid: string }> {
	const authId = process.env.PLIVO_AUTH_ID;
	const authToken = process.env.PLIVO_AUTH_TOKEN;
	const sourceNumber = process.env.PLIVO_PHONE_NUMBER;

	if (!((authId && authToken ) && sourceNumber)) {
		throw new Error(
			'SMS service not configured. Please set PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, and PLIVO_PHONE_NUMBER environment variables in your Convex Dashboard.'
		);
	}

	const credentials = Buffer.from(`${authId}:${authToken}`).toString('base64');

	const response = await fetch(`https://api.plivo.com/v1/Account/${authId}/Message/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Basic ${credentials}`
		},
		body: JSON.stringify({
			src: sourceNumber,
			dst: params.to.replaceAll(/[^\d+]/g, ''), // Clean phone number
			text: params.message
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Plivo SMS failed: ${response.status} - ${errorText}`);
	}

	const data: PlivoResponse = await response.json();
	return { messageUuid: data.message_uuid[0] };
}

/**
 * Generate OTP SMS message.
 */
export function generateOtpSms(code: string): string {
	return `Your HyprDoc verification code is: ${code}. This code expires in 10 minutes. Do not share this code.`;
}

/**
 * Generate signing notification SMS.
 */
export function generateSigningInviteSms(params: {
	senderName: string;
	documentTitle: string;
}): string {
	return `${params.senderName} has requested your signature on "${params.documentTitle}". Check your email for the signing link. - HyprDoc`;
}
