import express from "express";
import { authMiddleware, requireRole } from "../middleware";
import { Role } from "../../generated/prisma";
import {
  clockIn,
  clockOut,
  getActiveStaff,
  getUserLogs,
  getDashboard,
} from "../controllers/clock.controller";

const router = express.Router();

router.use(authMiddleware);

// Care worker actions
router.post("/clock-in", clockIn);
router.post("/clock-out", clockOut);

// Manager views
router.get(
  "/active-staff",
  requireRole(Role.MANAGER, Role.ADMIN),
  getActiveStaff
);
router.get("/user/:userId/logs", getUserLogs);
router.get("/dashboard", requireRole(Role.MANAGER, Role.ADMIN), getDashboard);

export default router;
