import { Prisma, PrismaClient } from "@prisma/client";

const prismaLogLevels: Prisma.LogLevel[] = process.env.LOG_DATABASE_QUERIES === "true"
  ? ["query", "error", "warn"]
  : ["error", "warn"];

const prisma = new PrismaClient({
  log: prismaLogLevels,
});

export default prisma;
