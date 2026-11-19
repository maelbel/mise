import { randomInt } from 'node:crypto'
import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'

// The same scrypt format as nuxt-auth-utils, usable outside the server (scripts, tests).
const hasher = new Hash(new Scrypt({}))

export function hashSecret(password: string): Promise<string> {
  return hasher.make(password)
}

export function verifySecret(hash: string, password: string): Promise<boolean> {
  return hasher.verify(hash, password)
}

/** A hash of nothing in particular, checked when the email is unknown so both cases take as long. */
let dummyHash: Promise<string> | undefined
export async function burnVerifyTime(password: string): Promise<void> {
  dummyHash ??= hasher.make('mise-unknown-account')
  await hasher.verify(await dummyHash, password)
}

// No 0/O, 1/l/i: easy to read out and type on a phone.
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'

/** A temporary password like `k7qm-x2pd-9vtr` (about 59 bits). */
export function generateTemporaryPassword(): string {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  return `${group()}-${group()}-${group()}`
}
