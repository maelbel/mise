import { createInterface } from 'node:readline'
import { Writable } from 'node:stream'
import { normalizeEmail, passwordProblem } from '../shared/utils/password'
import { createUser, EmailTakenError, setUpAdmin } from '../server/services/userService'
import { loadDbConfig } from '../server/utils/config'
import { connectDb } from '../server/utils/db'

/**
 * Creates an account from the terminal.
 *
 *   npm run user:create -- --admin   the family admin (asks for their password)
 *   npm run user:create              a member with a temporary password
 *
 * Nothing is read from arguments or files: secrets are typed at the prompt.
 */

// On a terminal, readline echoes what is typed through `output`: muting it hides passwords.
let muted = false
const output = new Writable({
  write(chunk, _encoding, done) {
    if (!muted) process.stdout.write(chunk)
    done()
  },
})
const interactive = !!process.stdin.isTTY
const rl = createInterface({ input: process.stdin, output, terminal: interactive })

// Answers arrive as lines; also works when they are piped in.
const pending: string[] = []
const waiting: ((line: string | null) => void)[] = []
let ended = false
rl.on('line', (line) => {
  const next = waiting.shift()
  if (next) next(line)
  else pending.push(line)
})
rl.on('close', () => {
  ended = true
  for (const next of waiting.splice(0)) next(null)
})

function ask(question: string, hidden = false): Promise<string> {
  process.stdout.write(question)
  muted = hidden
  return new Promise((resolve, reject) => {
    const answer = (line: string | null) => {
      muted = false
      if (hidden && interactive) process.stdout.write('\n')
      if (line === null) reject(new Error('The input ended before every answer was given.'))
      else resolve(line)
    }
    if (pending.length) answer(pending.shift()!)
    else if (ended) answer(null)
    else waiting.push(answer)
  })
}

async function askPassword(): Promise<string> {
  for (;;) {
    const password = await ask('Password (hidden): ', true)
    const problem = passwordProblem(password)
    if (problem) {
      console.log(problem)
      continue
    }
    if ((await ask('Same password again: ', true)) === password) return password
    console.log('The two passwords differ, try again.')
  }
}

const admin = process.argv.includes('--admin')
const { db, close } = connectDb(loadDbConfig())
try {
  const email = normalizeEmail(await ask('Email: '))
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('That is not a valid email address.')
  const name = (await ask('First name: ')).trim()
  if (!name) throw new Error('A first name is needed.')

  if (admin) {
    const { user, claimed } = await setUpAdmin(db, { email, name, password: await askPassword() })
    console.log(claimed
      ? `Admin ${user.email} is ready and owns the data that existed before accounts.`
      : `Admin ${user.email} is ready, with the starter recipes.`)
  } else {
    const { user, temporaryPassword } = await createUser(db, { email, name })
    console.log(`Account ${user.email} created. Temporary password, shown only now: ${temporaryPassword}`)
    console.log('They will choose their own password when they first log in.')
  }
} catch (error) {
  console.error(error instanceof EmailTakenError ? 'An account already uses this email.' : (error as Error).message)
  process.exitCode = 1
} finally {
  rl.close()
  await close()
}
