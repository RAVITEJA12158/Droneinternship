import { z } from 'zod'

export const uploadSchema = z.object({
  notes: z.string().max(1000).optional(),
})

export type UploadFormValues = z.infer<typeof uploadSchema>
