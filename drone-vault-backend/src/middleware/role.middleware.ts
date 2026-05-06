import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ code: "FORBIDDEN", message: "Insufficient permissions" });
      return;
    }
    next();
  };
}

export const adminOnly = requireRole(Role.ADMIN);
