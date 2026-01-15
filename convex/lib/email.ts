"use node";

import { Resend } from "resend";

// Lazy initialization - client is created on first use
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
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

export async function sendEmail(
  params: SendEmailParams
): Promise<{ id: string }> {
  const resend = getResendClient();

  const isDev = (process.env.NEXT_PUBLIC_APP_URL ?? "").includes("localhost");
  const from = isDev
    ? "onboarding@resend.dev"
    : (process.env.EMAIL_FROM ?? "HyprDoc <noreply@hyprdoc.app>");

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
    text: params.text,
  });

  if (error) {
    if (isDev && error.statusCode === 403) {
      throw new Error(
        `Development Mode Error: When using ${from}, you can ONLY send emails to the address registered with your Resend account. Attempted to send to: ${params.to}`
      );
    }
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { id: data?.id ?? "" };
}

// generateSigningInviteEmail removed

// generateOtpEmail removed

// generateSigningCompleteEmail removed

// generateDocumentCompletedEmail removed

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

  const isDev = (process.env.NEXT_PUBLIC_APP_URL ?? "").includes("localhost");
  const from = isDev
    ? "onboarding@resend.dev"
    : (process.env.EMAIL_FROM ?? "HyprDoc <noreply@hyprdoc.app>");

  if (isDev) {
    console.log(
      `[DEV] Sending email with ${params.attachments?.length ?? 0} attachments via ${from} to ${params.to}`
    );
  }

  // Convert attachments to Resend format
  const resendAttachments = params.attachments?.map((att) => ({
    filename: att.filename,
    content:
      typeof att.content === "string"
        ? Buffer.from(att.content, "base64")
        : att.content,
    contentType: att.contentType ?? "application/pdf",
  }));

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments: resendAttachments,
  });

  if (error) {
    if (isDev && error.statusCode === 403) {
      throw new Error(
        `Development Mode Error: When using ${from}, you can ONLY send emails to the address registered with your Resend account.`
      );
    }
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { id: data?.id ?? "" };
}

// generateReminderEmail removed

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
    params.role === "editor"
      ? "You'll be able to view and edit the document."
      : params.role === "admin"
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
