import { eq } from 'drizzle-orm'
import type { Profile, ProfileResponse } from '#shared/types/domain'
import { emptyProfile, resolveTargets, todayIso } from '#shared/utils/targets'
import { profiles } from '../db/schema'
import type { Db } from '../utils/db'

export async function readProfile(db: Db, userId: number): Promise<Profile> {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId))
  if (!row) return emptyProfile()
  const { userId: _owner, updatedAt: _updated, ...profile } = row
  return profile
}

function respond(profile: Profile, today: string): ProfileResponse {
  return { profile, ...resolveTargets(profile, today) }
}

export async function getProfile(db: Db, userId: number, today = todayIso()): Promise<ProfileResponse> {
  return respond(await readProfile(db, userId), today)
}

export async function saveProfile(db: Db, userId: number, profile: Profile, today = todayIso()): Promise<ProfileResponse> {
  const values = { ...profile, updatedAt: new Date() }
  await db
    .insert(profiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values })
  return respond(profile, today)
}
