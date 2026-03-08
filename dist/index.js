"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const identify_1 = __importDefault(require("./routes/identify"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "Bitespeed Identity Reconciliation API" });
});
// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/", identify_1.default);
// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
});
// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ Bitespeed server running on port ${PORT}`);
    console.log(`   POST http://localhost:${PORT}/identify`);
});
exports.default = app;
