import { existsSync } from 'node:fs'

// The integration tests read the same .env as the app.
if (existsSync('.env')) process.loadEnvFile('.env')
