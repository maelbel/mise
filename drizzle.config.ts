import { defineConfig } from 'drizzle-kit'

// Only used by `drizzle-kit generate`, which reads the schema and needs no database
// connection. Migrations are applied by `npm run db:migrate` (scripts/migrate.ts).
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
})
