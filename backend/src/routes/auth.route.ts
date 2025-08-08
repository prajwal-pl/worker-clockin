import express from "express";
import {
  googleAuthCallbackHandler,
  googleAuthHandler,
  loginHandler,
  registerHandler,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware";

const router = express.Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);

router.get("/logout", authMiddleware);
router.get("/google", googleAuthHandler);
router.get("/google/callback", googleAuthCallbackHandler);

export default router;
