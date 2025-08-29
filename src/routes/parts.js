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
router.use(requireAuth); // apply token auth to all routes

router.post("/", ...createPartValidator, validate, createPart);
router.get("/", getAllParts);
router.get("/:id", getPartById);
router.put("/:id", ...updatePartValidator, validate, updatePart);
router.delete("/:id", deletePart);

export default router;
