import express from "express";
import { authMiddleware, requireRole } from "../middleware";
import { Role } from "../../generated/prisma";
import {
  createPerimeter,
  listPerimeters,
  getPerimeter,
  updatePerimeter,
  deletePerimeter,
  checkWithinPerimeter,
} from "../controllers/perimeter.controller";

const router = express.Router();

router.use(authMiddleware);

// Manager endpoints
router.post("/", requireRole(Role.MANAGER, Role.ADMIN), createPerimeter);
router.get("/", requireRole(Role.MANAGER, Role.ADMIN), listPerimeters);
router.get("/:id", requireRole(Role.MANAGER, Role.ADMIN), getPerimeter);
router.put("/:id", requireRole(Role.MANAGER, Role.ADMIN), updatePerimeter);
router.delete("/:id", requireRole(Role.MANAGER, Role.ADMIN), deletePerimeter);

// Public check (could be unauthenticated if desired, keep auth for now)
router.get("/check/within", checkWithinPerimeter);

export default router;
