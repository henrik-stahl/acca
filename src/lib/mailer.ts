import { Resend } from "resend";

const EMAIL_FROM = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

interface SubmissionNotificationData {
  eventName: string;
  eventDate: string;
  accreditedName: string;
  company: string;
  category: string;
  submissionId: string;
}

export async function sendInvitationEmail(
  email: string,
  invitedByName: string
) {
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const loginUrl = `${appUrl}/login`;

  await getResend().emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "You've been invited to Acca",
    text: [
      `Hi,`,
      ``,
      `${invitedByName} has invited you to Acca — Hammarby Fotboll's press accreditation system.`,
      ``,
      `To get started, visit the link below and enter your email address to receive a sign-in link:`,
      ``,
      loginUrl,
      ``,
      `If you weren't expecting this invitation, you can safely ignore this email.`,
    ].join("\n"),
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 16px;background:#ffffff;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;">
              <img src="${appUrl}/acca_logo.png" alt="Acca" style="height:40px;width:auto;display:block;" />
            </td>
            <td style="vertical-align:middle;padding-right:12px;">
              <div style="width:1px;height:32px;background:#e5e7eb;"></div>
            </td>
            <td style="vertical-align:middle;">
              <img src="${appUrl}/hif-logo.png" alt="Hammarby IF" style="height:40px;width:auto;display:block;" />
            </td>
          </tr>
        </table>
        <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">You've been invited to Acca</h2>
        <p style="color:#6b7280;font-size:15px;margin:0 0 24px;line-height:1.5;">
          <strong>${invitedByName}</strong> has invited you to Acca — Hammarby Fotboll's press accreditation system.
          Click the button below to get started.
        </p>
        <a href="${loginUrl}"
          style="display:inline-block;background:#1b2e1e;color:#ffffff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
          Sign in to Acca
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px;line-height:1.5;">
          If you weren't expecting this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendSubmissionNotification(
  to: string[],
  data: SubmissionNotificationData
) {
  if (to.length === 0) return;

  const { eventName, eventDate, accreditedName, company, category, submissionId } = data;
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const submissionUrl = `${appUrl}/submissions?id=${submissionId}`;

  await getResend().emails.send({
    from: EMAIL_FROM,
    to: to,
    subject: `New submission: ${accreditedName} — ${eventName}`,
    text: [
      `New accreditation submission received.`,
      ``,
      `Event: ${eventName} (${eventDate})`,
      `Name: ${accreditedName}`,
      `Company: ${company}`,
      `Category: ${category}`,
      ``,
      `View submission: ${submissionUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;">
        <h2 style="color:#111;font-size:20px;margin:0 0 4px;">New submission received</h2>
        <p style="color:#888;font-size:13px;margin:0 0 24px;">A new accreditation request has been submitted.</p>

        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:10px 12px;background:#f9f9f9;border-radius:6px 6px 0 0;color:#888;width:110px;">Event</td>
            <td style="padding:10px 12px;background:#f9f9f9;border-radius:6px 6px 0 0;color:#111;font-weight:500;">${eventName}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border-top:1px solid #eee;color:#888;">Date</td>
            <td style="padding:10px 12px;border-top:1px solid #eee;color:#111;">${eventDate}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border-top:1px solid #eee;color:#888;">Name</td>
            <td style="padding:10px 12px;border-top:1px solid #eee;color:#111;font-weight:500;">${accreditedName}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border-top:1px solid #eee;color:#888;">Company</td>
            <td style="padding:10px 12px;border-top:1px solid #eee;color:#111;">${company ?? "—"}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border-top:1px solid #eee;border-radius:0 0 6px 6px;color:#888;">Category</td>
            <td style="padding:10px 12px;border-top:1px solid #eee;border-radius:0 0 6px 6px;color:#111;">${category}</td>
          </tr>
        </table>

        <a href="${submissionUrl}"
          style="display:inline-block;margin-top:24px;background:#1a5e35;color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View submission
        </a>

        <p style="color:#bbb;font-size:11px;margin-top:32px;">
          You're receiving this because you have submission notifications enabled in Acca.
          You can turn these off in your Settings page.
        </p>
      </div>
    `,
  });
}
