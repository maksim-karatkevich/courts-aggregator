import 'server-only'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'
import type { Db } from './schema'

function connect(): Db {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return drizzle(neon(url), { schema })
}

// Connected on first use, not on import: `next build` loads route modules without
// needing a database, while a request without DATABASE_URL fails with a clear message.
let instance: Db | undefined
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    instance ??= connect()
    const value = Reflect.get(instance, prop, instance)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
