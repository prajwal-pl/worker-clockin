import express from "express";
import {
  getCurrentUser,
  googleAuthCallbackHandler,
  googleAuthHandler,
  loginHandler,
  registerHandler,
  updateRoleHandler,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware";
import { logoutHandler } from "../controllers/auth.controller";

const router = express.Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);

router.put("/update-role", authMiddleware, updateRoleHandler);
router.get("/me", authMiddleware, getCurrentUser);

router.get("/logout", authMiddleware, logoutHandler);
router.get("/google", googleAuthHandler);
router.get("/google/callback", googleAuthCallbackHandler);

export default router;
