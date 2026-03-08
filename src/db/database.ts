import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/contacts.db");

// Ensure data directory exists
import fs from "fs";
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create Contact table
db.exec(`
  CREATE TABLE IF NOT EXISTS Contact (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    phoneNumber   TEXT,
    email         TEXT,
    linkedId      INTEGER,
    linkPrecedence TEXT NOT NULL CHECK(linkPrecedence IN ('primary', 'secondary')),
    createdAt     DATETIME NOT NULL DEFAULT (datetime('now')),
    updatedAt     DATETIME NOT NULL DEFAULT (datetime('now')),
    deletedAt     DATETIME,
    FOREIGN KEY (linkedId) REFERENCES Contact(id)
  );

  CREATE INDEX IF NOT EXISTS idx_contact_email ON Contact(email);
  CREATE INDEX IF NOT EXISTS idx_contact_phone ON Contact(phoneNumber);
  CREATE INDEX IF NOT EXISTS idx_contact_linkedId ON Contact(linkedId);
`);

export default db;
