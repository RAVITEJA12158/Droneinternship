import { z } from 'zod'

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  latitude: z
    .union([z.number().min(-90).max(90), z.nan()])
    .optional()
    .transform((v) => (isNaN(v as number) ? undefined : v)),
  longitude: z
    .union([z.number().min(-180).max(180), z.nan()])
    .optional()
    .transform((v) => (isNaN(v as number) ? undefined : v)),
})

export type ProjectFormValues = z.infer<typeof projectSchema>
