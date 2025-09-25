import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getUserOptions } from "../controllers/userController.js";

const router = express.Router();

// You can protect it with requireAuth if needed
router.use(requireAuth);

router.get("/options", getUserOptions);

export default router;
