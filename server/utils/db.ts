import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'
import { loadDbConfig, type DbConfig } from './config'

export type Db = PostgresJsDatabase<typeof schema>

export interface DbConnection {
  db: Db
  close: () => Promise<void>
}

export function connectDb(config: DbConfig, database = config.database): DbConnection {
  const client = postgres({
    host: config.host,
    port: config.port,
    username: config.user,
    password: config.password,
    database,
    onnotice: () => {},
  })
  return { db: drizzle(client, { schema }), close: () => client.end() }
}

let shared: DbConnection | undefined

/** The app's database connection, opened on first use. */
export function useDb(): Db {
  shared ??= connectDb(loadDbConfig())
  return shared.db
}
