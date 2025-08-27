import express from "express";
import {
    createPart,
    getAllParts,
    getPartById,
    updatePart,
    deletePart,
} from "../controllers/partController.js";
import { requireAuth } from "../middleware/auth.js";
import { createPartValidator, updatePartValidator } from "../validators/part.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.post("/", requireAuth, createPartValidator, validate, createPart);
router.get("/", requireAuth, getAllParts);
router.get("/:id", requireAuth, getPartById);
router.put("/:id", requireAuth, updatePartValidator, validate, updatePart);
router.delete("/:id", requireAuth, deletePart);

export default router;
