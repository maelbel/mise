import { z } from 'zod'

const dbConfigSchema = z.object({
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65535),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1, 'POSTGRES_PASSWORD is empty: set it in .env'),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_TEST_DB: z.string().min(1).default('meal_planner_test'),
})

export interface DbConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  testDatabase: string
}

/** Reads and validates the database settings. Throws a readable error when one is missing. */
export function loadDbConfig(env: Record<string, string | undefined> = process.env): DbConfig {
  const parsed = dbConfigSchema.safeParse(env)
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid database configuration (${details}). Copy .env.example to .env and fill it in.`)
  }
  const e = parsed.data
  return {
    host: e.POSTGRES_HOST,
    port: e.POSTGRES_PORT,
    user: e.POSTGRES_USER,
    password: e.POSTGRES_PASSWORD,
    database: e.POSTGRES_DB,
    testDatabase: e.POSTGRES_TEST_DB,
  }
}
