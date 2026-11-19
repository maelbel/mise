import postgres from 'postgres'
import { loadDbConfig } from '../server/utils/config'

const SAFE_NAME = /^[a-z_][a-z0-9_]*$/

// Creates POSTGRES_DB on the server when it does not exist yet. Never drops or changes anything.
const config = loadDbConfig()
if (!SAFE_NAME.test(config.database)) throw new Error(`Unsafe database name: ${config.database}`)

const admin = postgres({
  host: config.host,
  port: config.port,
  username: config.user,
  password: config.password,
  database: 'postgres',
  onnotice: () => {},
})
try {
  const rows = await admin`SELECT 1 FROM pg_database WHERE datname = ${config.database}`
  if (rows.length) {
    console.log(`Database "${config.database}" already exists.`)
  } else {
    await admin.unsafe(`CREATE DATABASE ${config.database}`)
    console.log(`Database "${config.database}" created.`)
  }
} finally {
  await admin.end()
}
