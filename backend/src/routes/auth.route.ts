import express from "express";
import {
  googleAuthCallbackHandler,
  googleAuthHandler,
  loginHandler,
  registerHandler,
  updateRoleHandler,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware";

const router = express.Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);

router.put("/update-role", authMiddleware, updateRoleHandler);

router.get("/logout", authMiddleware);
router.get("/google", googleAuthHandler);
router.get("/google/callback", googleAuthCallbackHandler);

export default router;
