import { Resend } from "resend";

interface EmailConfig {
  apiKey?: string;
  fromEmail?: string;
}

interface ShareInvitationParams {
  recipientEmail: string;
  quizTitle: string;
  ownerName: string;
  token: string;
  baseUrl: string;
}

const DEFAULT_FROM_EMAIL = "noreply@send.ecommitconsulting.be";

export class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor(config: EmailConfig) {
    this.fromEmail = config.fromEmail ?? DEFAULT_FROM_EMAIL;

    if (config.apiKey) {
      this.resend = new Resend(config.apiKey);
    } else {
      console.warn(
        "RESEND_API_KEY not set — share invitation emails will not be sent",
      );
    }
  }

  async sendShareInvitation(params: ShareInvitationParams): Promise<void> {
    if (!this.resend) {
      console.warn(
        `Email not configured — skipping invitation email to ${params.recipientEmail}`,
      );
      return;
    }

    const invitationUrl = `${params.baseUrl}/share/accept?token=${params.token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background-color: #4f46e5; padding: 24px 32px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Quiz Invitation</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.5; margin-top: 0;">
        <strong>${escapeHtml(params.ownerName)}</strong> has shared a quiz with you:
      </p>
      <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="color: #111827; font-size: 18px; font-weight: 600; margin: 0;">
          ${escapeHtml(params.quizTitle)}
        </p>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
        Click the button below to accept the invitation and access the quiz.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${invitationUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${invitationUrl}" style="color: #4f46e5;">${invitationUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>`.trim();

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: params.recipientEmail,
        subject: `${params.ownerName} shared a quiz with you: ${params.quizTitle}`,
        html,
      });
    } catch (error) {
      // Log but don't throw — sharing should work even if email delivery fails
      console.error("Failed to send share invitation email:", error);
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
