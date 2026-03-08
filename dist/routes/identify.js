"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const identityService_1 = require("../services/identityService");
const router = (0, express_1.Router)();
router.post("/identify", (req, res) => {
    try {
        const { email, phoneNumber } = req.body;
        // Validate: at least one field must be present (and non-null/empty)
        const hasEmail = email !== undefined && email !== null && email !== "";
        const hasPhone = phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== "";
        if (!hasEmail && !hasPhone) {
            return res.status(400).json({
                error: "At least one of 'email' or 'phoneNumber' must be provided.",
            });
        }
        const result = (0, identityService_1.identifyContact)({ email, phoneNumber });
        return res.status(200).json(result);
    }
    catch (err) {
        console.error("[/identify] Error:", err);
        const message = err instanceof Error ? err.message : "Internal server error";
        return res.status(500).json({ error: message });
    }
});
exports.default = router;
