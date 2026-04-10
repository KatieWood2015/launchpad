import { readFile, writeFile } from 'fs/promises'
import { Pool } from 'pg'
import { ensureConfigDir, getProfilePath } from './paths.js'

const hasDatabase = !!process.env.DATABASE_URL
let pool
let schemaReady = false

function getPool() {
  if (!hasDatabase) return null
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

async function ensureSchema() {
  if (!hasDatabase || schemaReady) return
  const client = await getPool().connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS launchpad_profiles (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    schemaReady = true
  } finally {
    client.release()
  }
}

export function isDatabaseConfigured() {
  return hasDatabase
}

export async function loadProfile(options = {}) {
  const { profileId = 'default', withMeta = false } = options
  if (hasDatabase) {
    await ensureSchema()
    const result = await getPool().query(
      'SELECT data, updated_at FROM launchpad_profiles WHERE id = $1',
      [profileId]
    )
    if (result.rows.length) {
      const row = result.rows[0]
      return withMeta ? { profile: row.data, source: 'database', updatedAt: row.updated_at } : row.data
    }

    // Migration fallback: if DB is enabled but empty, hydrate from existing file profile.
    try {
      const raw = await readFile(getProfilePath(), 'utf8')
      const fileProfile = JSON.parse(raw)
      await getPool().query(
        `INSERT INTO launchpad_profiles (id, data, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [profileId, JSON.stringify(fileProfile)]
      )
      return withMeta ? { profile: fileProfile, source: 'file-migrated' } : fileProfile
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return withMeta ? { profile: null, source: 'database' } : null
      }
      throw error
    }
  }

  try {
    const raw = await readFile(getProfilePath(), 'utf8')
    const profile = JSON.parse(raw)
    return withMeta ? { profile, source: 'file' } : profile
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return withMeta ? { profile: null, source: 'file' } : null
    }
    throw error
  }
}

export async function saveProfile(profile, options = {}) {
  const { profileId = 'default' } = options
  if (hasDatabase) {
    await ensureSchema()
    await getPool().query(
      `INSERT INTO launchpad_profiles (id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id)
       DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [profileId, JSON.stringify(profile)]
    )
  }

  await ensureConfigDir()
  await writeFile(getProfilePath(), JSON.stringify(profile, null, 2))
}

export async function patchProfile(mutator, options = {}) {
  const current = await loadProfile(options)
  if (!current) return null
  const next = mutator({ ...current })
  if (!next) return null
  await saveProfile(next, options)
  return next
}
