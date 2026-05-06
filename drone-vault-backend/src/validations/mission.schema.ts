import { z } from "zod";

export const createMissionSchema = z.object({
  name: z.string().min(1).max(200),
  captureDate: z.string().datetime(),
  notes: z.string().max(2000).optional(),
});

export const updateMissionSchema = createMissionSchema.partial();

export type CreateMissionInput = z.infer<typeof createMissionSchema>;
export type UpdateMissionInput = z.infer<typeof updateMissionSchema>;
