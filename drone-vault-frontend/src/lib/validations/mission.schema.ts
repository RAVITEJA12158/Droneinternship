import { z } from 'zod'

export const missionSchema = z.object({
  name: z.string().min(1, 'Mission name is required').max(100, 'Name too long'),
  captureDate: z.string().min(1, 'Capture date is required'),
  notes: z.string().max(1000, 'Notes too long').optional(),
})

export type MissionFormValues = z.infer<typeof missionSchema>
