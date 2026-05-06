import { z } from "zod";

export const fileQuerySchema = z.object({
  fileType: z
    .enum(["RGB_JPG", "MS_TIF", "MISSION_PLAN", "METADATA_JSON", "OTHER"])
    .optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type FileQueryInput = z.infer<typeof fileQuerySchema>;
