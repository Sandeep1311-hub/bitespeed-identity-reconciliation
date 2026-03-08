import db from "../db/database";
import { Contact, IdentifyRequest, IdentifyResponse } from "../models/contact";

// ─── DB helpers ──────────────────────────────────────────────────────────────

const findByEmailOrPhone = (email: string | null, phone: string | null): Contact[] => {
  const conditions: string[] = [];
  const params: (string | null)[] = [];

  if (email) {
    conditions.push("email = ?");
    params.push(email);
  }
  if (phone) {
    conditions.push("phoneNumber = ?");
    params.push(phone);
  }
  if (conditions.length === 0) return [];

  return db
    .prepare(
      `SELECT * FROM Contact WHERE (${conditions.join(" OR ")}) AND deletedAt IS NULL ORDER BY createdAt ASC`
    )
    .all(...params) as Contact[];
};

const findAllInCluster = (primaryId: number): Contact[] => {
  // Returns primary + all secondaries linked to it
  return db
    .prepare(
      `SELECT * FROM Contact
       WHERE (id = ? OR linkedId = ?) AND deletedAt IS NULL
       ORDER BY createdAt ASC`
    )
    .all(primaryId, primaryId) as Contact[];
};

const createContact = (
  email: string | null,
  phone: string | null,
  linkedId: number | null,
  linkPrecedence: "primary" | "secondary"
): Contact => {
  const result = db
    .prepare(
      `INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
    .run(email, phone, linkedId, linkPrecedence);

  return db
    .prepare(`SELECT * FROM Contact WHERE id = ?`)
    .get(result.lastInsertRowid) as Contact;
};

const demoteToPrimary = (oldPrimaryId: number, newPrimaryId: number): void => {
  // The older contact stays primary. The newer primary → secondary.
  db.prepare(
    `UPDATE Contact
     SET linkedId = ?, linkPrecedence = 'secondary', updatedAt = datetime('now')
     WHERE id = ?`
  ).run(newPrimaryId, oldPrimaryId);

  // Re-link all contacts that were pointing to the old primary
  db.prepare(
    `UPDATE Contact
     SET linkedId = ?, updatedAt = datetime('now')
     WHERE linkedId = ? AND id != ?`
  ).run(newPrimaryId, oldPrimaryId, oldPrimaryId);
};

// ─── Resolve root primary for a contact ──────────────────────────────────────

const getRootPrimary = (contact: Contact): Contact => {
  if (contact.linkPrecedence === "primary") return contact;
  return db
    .prepare(`SELECT * FROM Contact WHERE id = ?`)
    .get(contact.linkedId) as Contact;
};

// ─── Build response ───────────────────────────────────────────────────────────

const buildResponse = (primaryId: number): IdentifyResponse => {
  const cluster = findAllInCluster(primaryId);
  const primary = cluster.find((c) => c.id === primaryId)!;
  const secondaries = cluster.filter((c) => c.id !== primaryId);

  // Deduplicate while preserving order (primary's values first)
  const emails: string[] = [];
  const phones: string[] = [];
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  for (const c of [primary, ...secondaries]) {
    if (c.email && !seenEmails.has(c.email)) {
      seenEmails.add(c.email);
      emails.push(c.email);
    }
    if (c.phoneNumber && !seenPhones.has(c.phoneNumber)) {
      seenPhones.add(c.phoneNumber);
      phones.push(c.phoneNumber);
    }
  }

  return {
    contact: {
      primaryContatctId: primaryId,
      emails,
      phoneNumbers: phones,
      secondaryContactIds: secondaries.map((c) => c.id),
    },
  };
};

// ─── Main service function ────────────────────────────────────────────────────

export const identifyContact = (req: IdentifyRequest): IdentifyResponse => {
  const email = req.email?.trim() || null;
  const phone = req.phoneNumber?.toString().trim() || null;

  if (!email && !phone) {
    throw new Error("At least one of email or phoneNumber must be provided.");
  }

  // 1. Find all existing contacts matching email or phone
  const matches = findByEmailOrPhone(email, phone);

  // 2. No matches → brand new customer
  if (matches.length === 0) {
    const newContact = createContact(email, phone, null, "primary");
    return buildResponse(newContact.id);
  }

  // 3. Resolve all unique primaries from the matched contacts
  const primaries: Contact[] = [];
  const seenPrimaryIds = new Set<number>();

  for (const match of matches) {
    const primary = getRootPrimary(match);
    if (!seenPrimaryIds.has(primary.id)) {
      seenPrimaryIds.add(primary.id);
      primaries.push(primary);
    }
  }

  // 4. If two separate primary clusters got linked by this request → merge them
  //    The older primary (earlier createdAt / lower id) wins.
  let truePrimary: Contact;

  if (primaries.length > 1) {
    // Sort by createdAt ascending so the oldest is first
    primaries.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    truePrimary = primaries[0];

    // Demote all newer primaries
    for (let i = 1; i < primaries.length; i++) {
      demoteToPrimary(primaries[i].id, truePrimary.id);
    }
  } else {
    truePrimary = primaries[0];
  }

  // 5. Check if the incoming request carries brand-new information
  const cluster = findAllInCluster(truePrimary.id);

  const emailExists = email ? cluster.some((c) => c.email === email) : true;
  const phoneExists = phone ? cluster.some((c) => c.phoneNumber === phone) : true;

  if (!emailExists || !phoneExists) {
    // New info → create a secondary contact
    createContact(email, phone, truePrimary.id, "secondary");
  }

  return buildResponse(truePrimary.id);
};
