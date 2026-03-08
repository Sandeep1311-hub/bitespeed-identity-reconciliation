import { Router, Request, Response } from "express";
import { identifyContact } from "../services/identityService";
import { IdentifyRequest } from "../models/contact";

const router = Router();

router.post("/identify", (req: Request, res: Response) => {
  try {
    const { email, phoneNumber }: IdentifyRequest = req.body;

    // Validate: at least one field must be present (and non-null/empty)
    const hasEmail = email !== undefined && email !== null && email !== "";
    const hasPhone = phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== "";

    if (!hasEmail && !hasPhone) {
      return res.status(400).json({
        error: "At least one of 'email' or 'phoneNumber' must be provided.",
      });
    }

    const result = identifyContact({ email, phoneNumber });
    return res.status(200).json(result);
  } catch (err: unknown) {
    console.error("[/identify] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
});

export default router;
