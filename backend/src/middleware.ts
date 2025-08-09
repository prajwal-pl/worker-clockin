import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { PrismaClient, Role } from "../generated/prisma";

const prisma = new PrismaClient();

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

  if (!decoded || !decoded.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.userId = decoded.userId;
  next();
};

export const requireRole =
  (...roles: Role[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    } catch (e) {
      return res.status(500).json({ error: "Internal server error" });
    }
  };
