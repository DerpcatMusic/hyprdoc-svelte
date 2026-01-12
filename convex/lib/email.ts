'use node';

import { Resend } from 'resend';

// Lazy initialization - client is created on first use
let resendClient: Resend | null = null;

function getResendClient(): Resend {
	if (!resendClient) {
		const apiKey = process.env.RESEND_API_KEY;
		if (!apiKey) {
			throw new Error('RESEND_API_KEY environment variable is not set');
		}
		resendClient = new Resend(apiKey);
	}
	return resendClient;
}

export interface SendEmailParams {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string }> {
	const resend = getResendClient();

	const isDev = (process.env.NEXT_PUBLIC_APP_URL ?? '').includes('localhost');
	const from = isDev
		? 'onboarding@resend.dev'
		: (process.env.EMAIL_FROM ?? 'HyprDoc <noreply@hyprdoc.app>');

	// In dev mode with onboarding domain, we can only send to the registered email.
	// We'll log a warning if this might be an issue, but we can't easily check the registered email here.
	if (isDev) {
		console.log(
			`[DEV] Sending email via ${from} to ${params.to}. Ensure recipient is verified in Resend Dashboard.`
		);
	}

	const { data, error } = await resend.emails.send({
		from,
		to: params.to,
		subject: params.subject,
		html: params.html,
		text: params.text
	});

	if (error) {
		if (isDev && error.statusCode === 403) {
			throw new Error(
				`Development Mode Error: When using ${from}, you can ONLY send emails to the address registered with your Resend account. Attempted to send to: ${params.to}`
			);
		}
		throw new Error(`Failed to send email: ${error.message}`);
	}

	return { id: data?.id ?? '' };
}

export function generateSigningInviteEmail(params: {
	signerName: string;
	documentTitle: string;
	senderName: string;
	signingLink: string;
}): { subject: string; html: string; text: string } {
	const subject = `${params.senderName} has requested your signature on "${params.documentTitle}"`;

	const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; }
          .button { display: inline-block; padding: 14px 28px; background: #000; color: #fff !important; text-decoration: none; font-weight: bold; border-radius: 0; }
          .button:hover { background: #333; }
          .document-title { font-size: 20px; font-weight: bold; padding: 15px; background: #f5f5f5; border-left: 4px solid #000; margin: 20px 0; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">HyprDoc</div>
          </div>
          
          <h1 style="margin: 0 0 20px 0;">Signature Requested</h1>
          
          <p>Hi ${params.signerName},</p>
          
          <p><strong>${params.senderName}</strong> has requested your signature on:</p>
          
          <div class="document-title">${params.documentTitle}</div>
          
          <p>Click the button below to review and sign the document. You will need to verify your identity before signing.</p>
          
          <p style="margin: 30px 0;">
            <a href="${params.signingLink}" class="button">Review & Sign Document</a>
          </p>
          
          <div class="footer">
            <p><strong>This link will expire in 7 days.</strong></p>
            <p>If you did not expect this request, please ignore this email.</p>
            <p>— HyprDoc</p>
          </div>
        </div>
      </body>
    </html>
  `;

	const text = `
Hi ${params.signerName},

${params.senderName} has requested your signature on "${params.documentTitle}".

Click here to review and sign: ${params.signingLink}

You will need to verify your identity before signing.

This link will expire in 7 days.

— HyprDoc
  `.trim();

	return { subject, html, text };
}

export function generateOtpEmail(params: {
	recipientName: string;
	code: string;
	expiresInMinutes: number;
}): { subject: string; html: string; text: string } {
	const subject = `Your HyprDoc verification code: ${params.code}`;

	const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; }
          .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 25px; background: #f5f5f5; text-align: center; margin: 25px 0; border: 2px solid #000; font-family: monospace; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .warning { color: #d32f2f; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">HyprDoc</div>
          </div>
          
          <h1 style="margin: 0 0 20px 0;">Verify Your Email</h1>
          
          <p>Hi ${params.recipientName},</p>
          
          <p>Enter this code to verify your email address:</p>
          
          <div class="code">${params.code}</div>
          
          <p class="warning">This code expires in ${params.expiresInMinutes} minutes.</p>
          
          <p>If you didn't request this code, please ignore this email. Someone may have entered your email address by mistake.</p>
          
          <div class="footer">
            <p>— HyprDoc</p>
          </div>
        </div>
      </body>
    </html>
  `;

	const text = `
Hi ${params.recipientName},

Your HyprDoc verification code is: ${params.code}

This code expires in ${params.expiresInMinutes} minutes.

If you didn't request this code, please ignore this email.

— HyprDoc
  `.trim();

	return { subject, html, text };
}

export function generateSigningCompleteEmail(params: {
	signerName: string;
	documentTitle: string;
	signedAt: string;
}): { subject: string; html: string; text: string } {
	const subject = `You've signed "${params.documentTitle}"`;

	const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; }
          .success { color: #2e7d32; font-size: 18px; font-weight: bold; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">HyprDoc</div>
          </div>
          
          <p class="success">✓ Document Signed Successfully</p>
          
          <p>Hi ${params.signerName},</p>
          
          <p>You have successfully signed <strong>"${params.documentTitle}"</strong> on ${params.signedAt}.</p>
          
          <p>A copy of the signed document will be sent to you once all slots have signed.</p>
          
          <div class="footer">
            <p>This is a confirmation of your electronic signature.</p>
            <p>— HyprDoc</p>
          </div>
        </div>
      </body>
    </html>
  `;

	const text = `
Hi ${params.signerName},

You have successfully signed "${params.documentTitle}" on ${params.signedAt}.

A copy of the signed document will be sent to you once all slots have signed.

— HyprDoc
  `.trim();

	return { subject, html, text };
}

/**
 * Generate email for document fully completed (all signers done) with PDF attachment.
 */
export function generateDocumentCompletedEmail(params: {
	signerName: string;
	documentTitle: string;
	completedAt: string;
	downloadLink?: string;
}): { subject: string; html: string; text: string } {
	const subject = `Your signed document: "${params.documentTitle}"`;

	const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; }
          .success-badge { display: inline-block; padding: 8px 16px; background: #d1fae5; color: #065f46; font-weight: bold; font-size: 14px; border-radius: 4px; }
          .document-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .document-title { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
          .metadata { color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 14px 28px; background: #000; color: #fff !important; text-decoration: none; font-weight: bold; border-radius: 6px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .security { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin-top: 20px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">HyprDoc</div>
          </div>
          
          <p class="success-badge">✓ Document Completed</p>
          
          <p style="margin-top: 24px;">Hi ${params.signerName},</p>
          
          <p>All slots have signed the document. Your legally binding copy is ready.</p>
          
          <div class="document-card">
            <div class="document-title">${params.documentTitle}</div>
            <div class="metadata">Completed on ${params.completedAt}</div>
          </div>
          
          ${
						params.downloadLink
							? `
          <p style="margin: 30px 0;">
            <a href="${params.downloadLink}" class="button">Download Signed PDF</a>
          </p>
          `
							: `
          <p><strong>The signed PDF is attached to this email.</strong></p>
          `
					}
          
          <div class="security">
            <strong>🔒 Security Note:</strong> This document has been digitally signed and cryptographically sealed. 
            Any modifications to the PDF will invalidate the signature.
          </div>
          
          <div class="footer">
            <p>Keep this email for your records. The attached PDF serves as your official copy.</p>
            <p>— HyprDoc</p>
          </div>
        </div>
      </body>
    </html>
  `;

	const text = `
Hi ${params.signerName},

All slots have signed "${params.documentTitle}".

Completed on: ${params.completedAt}

${params.downloadLink ? `Download your signed copy: ${params.downloadLink}` : 'The signed PDF is attached to this email.'}

Keep this email for your records.

— HyprDoc
  `.trim();

	return { subject, html, text };
}

/**
 * Attachment interface for sending PDFs via email.
 */
export interface EmailAttachment {
	filename: string;
	content: Buffer | string; // Buffer or base64 string
	contentType?: string;
}

/**
 * Extended send email with attachment support.
 */
export async function sendEmailWithAttachments(params: {
	to: string;
	subject: string;
	html: string;
	text?: string;
	attachments?: EmailAttachment[];
}): Promise<{ id: string }> {
	const resend = getResendClient();

	const isDev = (process.env.NEXT_PUBLIC_APP_URL ?? '').includes('localhost');
	const from = isDev
		? 'onboarding@resend.dev'
		: (process.env.EMAIL_FROM ?? 'HyprDoc <noreply@hyprdoc.app>');

	if (isDev) {
		console.log(
			`[DEV] Sending email with ${params.attachments?.length ?? 0} attachments via ${from} to ${params.to}`
		);
	}

	// Convert attachments to Resend format
	const resendAttachments = params.attachments?.map((att) => ({
		filename: att.filename,
		content: typeof att.content === 'string' ? Buffer.from(att.content, 'base64') : att.content,
		contentType: att.contentType ?? 'application/pdf'
	}));

	const { data, error } = await resend.emails.send({
		from,
		to: params.to,
		subject: params.subject,
		html: params.html,
		text: params.text,
		attachments: resendAttachments
	});

	if (error) {
		if (isDev && error.statusCode === 403) {
			throw new Error(
				`Development Mode Error: When using ${from}, you can ONLY send emails to the address registered with your Resend account.`
			);
		}
		throw new Error(`Failed to send email: ${error.message}`);
	}

	return { id: data?.id ?? '' };
}

/**
 * Generate reminder email for signers who haven't completed signing.
 */
export function generateReminderEmail(params: {
	signerName: string;
	documentTitle: string;
	senderName: string;
	signingLink: string;
	daysSinceInvite: number;
}): { subject: string; html: string; text: string } {
	const subject = `Reminder: Your signature is still needed on "${params.documentTitle}"`;

	const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { border-bottom: 3px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; }
          .reminder-badge { display: inline-block; padding: 6px 12px; background: #fef3c7; color: #92400e; font-weight: bold; font-size: 12px; border-radius: 4px; text-transform: uppercase; }
          .button { display: inline-block; padding: 14px 28px; background: #000; color: #fff !important; text-decoration: none; font-weight: bold; border-radius: 6px; }
          .document-title { font-size: 18px; font-weight: bold; padding: 15px; background: #f5f5f5; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">HyprDoc</div>
          </div>
          
          <span class="reminder-badge">⏰ Reminder</span>
          
          <h1 style="margin: 16px 0 20px 0;">Your signature is still needed</h1>
          
          <p>Hi ${params.signerName},</p>
          
          <p><strong>${params.senderName}</strong> is waiting for your signature on:</p>
          
          <div class="document-title">${params.documentTitle}</div>
          
          <p>This request was sent ${params.daysSinceInvite} day${params.daysSinceInvite > 1 ? 's' : ''} ago. Please review and sign at your earliest convenience.</p>
          
          <p style="margin: 30px 0;">
            <a href="${params.signingLink}" class="button">Review & Sign Document</a>
          </p>
          
          <div class="footer">
            <p><strong>This link will expire soon.</strong></p>
            <p>If you did not expect this request or have already completed signing, please ignore this email.</p>
            <p>— HyprDoc</p>
          </div>
        </div>
      </body>
    </html>
  `;

	const text = `
Hi ${params.signerName},

REMINDER: Your signature is still needed on "${params.documentTitle}".

${params.senderName} is waiting for your signature. This request was sent ${params.daysSinceInvite} day${params.daysSinceInvite > 1 ? 's' : ''} ago.

Click here to review and sign: ${params.signingLink}

This link will expire soon.

— HyprDoc
  `.trim();

	return { subject, html, text };
}

/**
 * Generate email for document collaboration invite.
 */
export function generateCollaborationInviteEmail(params: {
	recipientEmail: string;
	documentTitle: string;
	inviterName: string;
	role: string;
	inviteLink: string;
}): { subject: string; html: string; text: string } {
	const subject = `${params.inviterName} invited you to collaborate on "${params.documentTitle}"`;

	const roleDescription =
		params.role === 'editor'
			? "You'll be able to view and edit the document."
			: params.role === 'admin'
				? "You'll have full admin access to the document."
				: "You'll be able to view the document.";

	const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; }
          .button { display: inline-block; padding: 14px 28px; background: #6366f1; color: #fff !important; text-decoration: none; font-weight: bold; border-radius: 6px; }
          .button:hover { background: #4f46e5; }
          .document-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .document-title { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
          .role-badge { display: inline-block; padding: 4px 12px; background: #e0e7ff; color: #4338ca; font-size: 12px; font-weight: 600; border-radius: 9999px; text-transform: capitalize; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">HyprDoc</div>
          </div>
          
          <h1 style="margin: 0 0 20px 0;">You're Invited to Collaborate</h1>
          
          <p><strong>${params.inviterName}</strong> has invited you to collaborate on a document.</p>
          
          <div class="document-card">
            <div class="document-title">${params.documentTitle}</div>
            <span class="role-badge">${params.role}</span>
            <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 14px;">${roleDescription}</p>
          </div>
          
          <p style="margin: 30px 0;">
            <a href="${params.inviteLink}" class="button">Accept Invitation</a>
          </p>
          
          <p style="font-size: 14px; color: #6b7280;">
            Or copy and paste this link in your browser:<br>
            <a href="${params.inviteLink}" style="color: #6366f1; word-break: break-all;">${params.inviteLink}</a>
          </p>
          
          <div class="footer">
            <p><strong>This invitation link will expire in 7 days.</strong></p>
            <p>If you did not expect this invitation, you can safely ignore this email.</p>
            <p>— HyprDoc</p>
          </div>
        </div>
      </body>
    </html>
  `;

	const text = `
You're Invited to Collaborate

${params.inviterName} has invited you to collaborate on "${params.documentTitle}".

Your role: ${params.role}
${roleDescription}

Click here to accept the invitation: ${params.inviteLink}

This invitation link will expire in 7 days.

If you did not expect this invitation, you can safely ignore this email.

— HyprDoc
  `.trim();

	return { subject, html, text };
}
