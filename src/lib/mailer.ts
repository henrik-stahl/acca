import nodemailer from "nodemailer";

export const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

interface SubmissionNotificationData {
  eventName: string;
  eventDate: string;
  accreditedName: string;
  company: string;
  category: string;
  submissionId: string;
}

export async function sendSubmissionNotification(
  to: string[],
  data: SubmissionNotificationData
) {
  if (to.length === 0) return;

  const { eventName, eventDate, accreditedName, company, category, submissionId } = data;
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const submissionUrl = `${appUrl}/submissions?id=${submissionId}`;

  await transport.sendMail({
    from: `Acca <${process.env.EMAIL_FROM}>`,
    to: to.join(", "),
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
