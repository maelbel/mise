import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { createUser, type UserRow } from '../../server/services/userService'
import { loadDbConfig, type DbConfig } from '../../server/utils/config'
import { connectDb, type DbConnection } from '../../server/utils/db'

const SAFE_NAME = /^[a-z_][a-z0-9_]*$/

/** Passwords of the test accounts. Test-only values, never used anywhere else. */
export const ADMIN = { email: 'alice@example.test', name: 'Alice', password: 'alice-test-password' }
export const MEMBER = { email: 'bob@example.test', name: 'Bob', password: 'bob-test-password' }

async function ensureDatabase(config: DbConfig): Promise<void> {
  if (!SAFE_NAME.test(config.testDatabase)) throw new Error(`Unsafe test database name: ${config.testDatabase}`)
  if (config.testDatabase === config.database) throw new Error('POSTGRES_TEST_DB must differ from POSTGRES_DB')
  const admin = postgres({
    host: config.host, port: config.port, username: config.user, password: config.password,
    database: config.database, onnotice: () => {},
  })
  try {
    const rows = await admin`SELECT 1 FROM pg_database WHERE datname = ${config.testDatabase}`
    if (!rows.length) await admin.unsafe(`CREATE DATABASE ${config.testDatabase}`)
  } finally {
    await admin.end()
  }
}

/** An empty test database (schema dropped and recreated), not migrated. */
export async function emptyTestDb(): Promise<DbConnection & { config: DbConfig }> {
  const config = loadDbConfig()
  await ensureDatabase(config)
  const conn = connectDb(config, config.testDatabase)
  await conn.db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`)
  await conn.db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`)
  await conn.db.execute(sql`CREATE SCHEMA public`)
  return { ...conn, config }
}

/**
 * A fresh, migrated test database with two accounts that each have the
 * starter data for the current week: an admin and a member, both with a
 * chosen (not temporary) password.
 */
export async function freshTestDb(): Promise<DbConnection & { config: DbConfig, admin: UserRow, member: UserRow }> {
  const conn = await emptyTestDb()
  await migrate(conn.db, { migrationsFolder: 'server/db/migrations' })
  const { user: admin } = await createUser(conn.db, { ...ADMIN, isAdmin: true })
  const { user: member } = await createUser(conn.db, MEMBER)
  return { ...conn, admin, member }
}
