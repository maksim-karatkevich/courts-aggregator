import 'server-only'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'
import type { Db } from './schema'

export const db: Db = drizzle(neon(process.env.DATABASE_URL!), { schema })
