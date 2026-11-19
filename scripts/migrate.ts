import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { loadDbConfig } from '../server/utils/config'
import { connectDb } from '../server/utils/db'

const { db, close } = connectDb(loadDbConfig())
try {
  await migrate(db, { migrationsFolder: 'server/db/migrations' })
  console.log('Migrations applied.')
} finally {
  await close()
}
