import crypto from "crypto";
import type { Contact, Event, Submission } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────────────

type SubmissionWithRelations = Submission & {
  event: Event;
  accredited: Contact;
};

// ── Config ─────────────────────────────────────────────────────────────────────

const HOST = "api.datatalks.se";
const REGION = process.env.DATATALKS_REGION ?? "eu-north-1";
const SERVICE = process.env.DATATALKS_SERVICE ?? "execute-api";
const ACCESS_KEY_ID = process.env.DATATALKS_ACCESS_KEY_ID ?? "";
const SECRET_KEY = process.env.DATATALKS_SECRET_KEY ?? "";

// ── Status mapping ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  "Pending": "received",
  "Approved": "approved",
  "Rejected": "rejected",
  "Info requested": "additional_info",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Format a Date to DataTalks's expected format: "YYYY-MM-DD HH:mm" */
function dtFormat(date: Date): string {
  return date.toISOString().slice(0, 16).replace("T", " ");
}

// ── AWS Signature V4 ───────────────────────────────────────────────────────────

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function getSigningKey(dateStamp: string): Buffer {
  const kDate = hmac(`AWS4${SECRET_KEY}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

async function signedPost(path: string, payload: object): Promise<void> {
  const now = new Date();
  // Format: "20260508T120000Z"
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);

  const body = JSON.stringify(payload);
  const payloadHash = sha256hex(body);

  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${HOST}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";

  const canonicalRequest = [
    "POST",
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256hex(canonicalRequest),
  ].join("\n");

  const signature = crypto
    .createHmac("sha256", getSigningKey(dateStamp))
    .update(stringToSign, "utf8")
    .digest("hex");

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  const res = await fetch(`https://${HOST}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-amz-date": amzDate,
      Authorization: authHeader,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataTalks ${path} responded ${res.status}: ${text}`);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Send a Profile payload when a Contact is created or updated. */
export async function sendProfile(contact: Contact): Promise<void> {
  await signedPost("/v3/profiles", {
    type: "acca_person",
    data: {
      acca_customer_id: contact.contactId.toLowerCase(),
      acca_customer_creation_date: dtFormat(contact.createdAt),
      acca_customer_first_name: contact.firstName,
      acca_customer_last_name: contact.lastName,
      acca_customer_email: contact.email,
      acca_customer_organization: contact.company ?? "",
      acca_customer_role: contact.role ?? "",
      acca_customer_work_phone: contact.workPhone ?? "",
      acca_customer_cell_phone: contact.cellPhone ?? "",
    },
  });
}

/** Send an Inventory payload when an Event (match) is created or updated. */
export async function sendInventory(event: Event): Promise<void> {
  await signedPost("/v3/events", {
    type: "acca_event",
    data: {
      modified_date: dtFormat(new Date()),
      acca_event_id: event.eventId.toLowerCase(),
      acca_event_name: event.eventName,
      acca_event_date: dtFormat(event.eventDate),
      acca_event_venue: event.arena ?? "",
      acca_event_press_seats: String(event.pressSeatsCapacity ?? ""),
      acca_event_photo_pit: String(event.photoPitCapacity ?? ""),
    },
  });
}

/** Send an Event payload when a Submission is created or its status changes. */
export async function sendNotification(
  submission: SubmissionWithRelations
): Promise<void> {
  await signedPost("/v3/events", {
    type: "acca_submission",
    data: {
      event_id: crypto.randomUUID(),
      modified_date: dtFormat(new Date()),
      acca_status: STATUS_MAP[submission.status] ?? submission.status.toLowerCase(),
      acca_submission_id: submission.submissionId.toLowerCase(),
      acca_submission_additional_info: submission.infoRequestMessage ?? "",
      acca_event_id: submission.event.eventId.toLowerCase(),
      acca_event_name: submission.event.eventName,
      acca_event_date: dtFormat(submission.event.eventDate),
      acca_venue: submission.event.arena ?? "",
      acca_customer_id: submission.accredited.contactId.toLowerCase(),
      acca_customer_first_name: submission.accredited.firstName,
      acca_customer_last_name: submission.accredited.lastName,
      acca_customer_email: submission.accredited.email,
    },
  });
}
