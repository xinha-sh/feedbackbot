import { z } from 'zod'

export const VoteSchema = z.object({
  ticket_id: z.string().min(1).max(64),
})
export type VotePayload = z.infer<typeof VoteSchema>

export const VoteResponseSchema = z.object({
  upvotes: z.number().int().nonnegative(),
  voted: z.boolean(),
})
export type VoteResponse = z.infer<typeof VoteResponseSchema>
