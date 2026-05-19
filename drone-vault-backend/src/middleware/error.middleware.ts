import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      fields[issue.path.join(".")] = issue.message;
    }
    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      fields,
    });
    return;
  }

  // Prisma not found
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({ code: "NOT_FOUND", message: "Resource not found" });
      return;
    }
    if (err.code === "P2002") {
      res.status(409).json({ code: "CONFLICT", message: "Resource already exists" });
      return;
    }
  }

  // JWT errors
  if (err instanceof TokenExpiredError) {
    res.status(401).json({ code: "TOKEN_EXPIRED", message: "Token has expired" });
    return;
  }
  if (err instanceof JsonWebTokenError) {
    res.status(401).json({ code: "UNAUTHORIZED", message: "Invalid token" });
    return;
  }

  // Multer errors
  if (err instanceof Error && err.message.includes("Invalid file type")) {
    res.status(400).json({ code: "INVALID_FILE_TYPE", message: err.message });
    return;
  }

  // Generic errors
  if (err instanceof Error) {
    // Services attach a statusCode for domain errors (404, 401, 409, etc.)
    const statusCode = (err as Error & { statusCode?: number }).statusCode;
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      res.status(statusCode).json({ code: "CLIENT_ERROR", message: err.message });
      return;
    }
    console.error("[error] Unhandled server error while processing request.", err);
    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    });
    return;
  }

  res.status(500).json({ code: "INTERNAL_ERROR", message: "Internal server error" });
}
