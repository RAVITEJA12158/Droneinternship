import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET, COOKIE_NAME } from "../config/jwt";
import { Role } from "@prisma/client";

interface JwtPayload {
  sub: string;
  role: Role;
  iat: number;
  exp: number;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ code: "UNAUTHORIZED", message: "Authentication required" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ code: "UNAUTHORIZED", message: "Invalid or expired token" });
  }
}
