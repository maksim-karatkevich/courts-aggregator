import { z } from 'zod'
import { parseClubKey } from './types'

export const clubRefSchema = z.object({
  platform: z.enum(['tenis4u', 'twojtennis']),
  clubId: z.string().min(1).max(64),
})

export const bookingClickSchema = clubRefSchema.extend({
  court: z.string().min(1).max(64).nullish(),
})

export const mergeSchema = z.object({
  favorites: z
    .array(z.string().refine((key) => parseClubKey(key) !== null))
    .max(200),
})
