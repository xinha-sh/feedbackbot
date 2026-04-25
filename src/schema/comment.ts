import { z } from 'zod'

export const CommentSchema = z.object({
  ticket_id: z.string().min(1).max(64),
  message: z.string().trim().min(1).max(2000),
  author_name: z.string().trim().min(1).max(60).optional(),
})
export type CommentPayload = z.infer<typeof CommentSchema>
