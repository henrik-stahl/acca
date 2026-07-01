import { prisma } from "@/lib/prisma";
import { normalizeContactKey } from "@/lib/utils";
import type { Contact } from "@prisma/client";

/**
 * Find an existing contact that is the same person as the given identity,
 * after normalisation (case, whitespace, and non-Swedish diacritics folded;
 * see normalizeContactKey). Returns null when there is no match.
 *
 * Matching is done in application code rather than a SQL WHERE clause because
 * SQLite cannot do accent-/case-insensitive comparison on these fields. This
 * is fine at the current contact volume (a few thousand rows). If the Contact
 * table ever grows very large, add an indexed, pre-normalised key column and
 * query on that instead.
 */
export async function findMatchingContact(input: {
  firstName: string;
  lastName: string;
  email: string;
}): Promise<Contact | null> {
  const key = normalizeContactKey(input);
  const candidates = await prisma.contact.findMany();
  return candidates.find((c) => normalizeContactKey(c) === key) ?? null;
}
