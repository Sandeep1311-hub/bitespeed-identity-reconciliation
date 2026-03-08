"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const DB_PATH = process.env.DB_PATH || path_1.default.join(__dirname, "../../data/contacts.db");
// Ensure data directory exists
const fs_1 = __importDefault(require("fs"));
const dataDir = path_1.default.dirname(DB_PATH);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const db = new better_sqlite3_1.default(DB_PATH);
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
exports.default = db;
