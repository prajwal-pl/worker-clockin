import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

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
