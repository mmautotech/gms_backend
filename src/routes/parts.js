// routes/partsRoutes.js
import express from "express";
import {
    createPart,
    getParts,
    getPartById,
    updatePart,
    deletePart,
    restockPart,
} from "../controllers/partController.js";

const router = express.Router();

router.post("/", createPart);
router.get("/", getParts);
router.get("/:id", getPartById);
router.put("/:id", updatePart);
router.delete("/:id", deletePart);
router.patch("/:id/restock", restockPart);

export default router;
