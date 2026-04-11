/**
 * Best-effort verification that a job posting URL still resolves.
 * Many career sites block bots; we treat network/timeout as inconclusive (allow).
 */

const DEAD_SNIPPETS = [
  'no longer accepting',
  'position has been filled',
  'this job is no longer',
  'job has expired',
  'page not found',
  '404 error',
  'access denied',
  'this listing is closed',
]

function normalizeUrlKey(raw) {
  try {
    const u = new URL(raw)
    u.hash = ''
    ;['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source'].forEach((k) => u.searchParams.delete(k))
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/$/, '') || '/'}`
  } catch {
    return String(raw || '').trim().toLowerCase()
  }
}

export function jobFingerprint(job) {
  return normalizeUrlKey(job?.url || '')
}

export function recentJobUrlKeys(profile, maxAgeDays = 14) {
  const list = Array.isArray(profile?.recentDigestJobs) ? profile.recentDigestJobs : []
  const cutoff = Date.now() - maxAgeDays * 86400000
  const keys = new Set()
  for (const row of list) {
    if (!row?.urlKey || !row?.sentAt) continue
    const t = Date.parse(row.sentAt)
    if (Number.isFinite(t) && t >= cutoff) keys.add(row.urlKey)
  }
  return keys
}

export function recordSentJobs(profile, jobs) {
  const prev = Array.isArray(profile.recentDigestJobs) ? profile.recentDigestJobs : []
  const sentAt = new Date().toISOString()
  const additions = jobs.map((j) => ({
    urlKey: jobFingerprint(j),
    url: j.url,
    title: j.title,
    company: j.company,
    sentAt,
  })).filter((r) => r.urlKey)

  const merged = [...additions, ...prev].filter((r) => r.urlKey)
  // cap list size
  profile.recentDigestJobs = merged.slice(0, 80)
}

/**
 * @returns {{ ok: boolean, finalUrl?: string, reason?: string }}
 */
export async function verifyJobPostingUrl(url) {
  if (!url || typeof url !== 'string') return { ok: false, reason: 'missing url' }
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, reason: 'invalid url' }
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return { ok: false, reason: 'unsupported protocol' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)

  const headers = {
    'user-agent': 'LaunchpadJobBot/1.0 (+https://github.com/KatieWood2015/launchpad)',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  }

  try {
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers,
    })

    if (res.status === 405 || res.status === 403 || res.status === 404) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { ...headers, range: 'bytes=0-49151' },
      })
    }

    const finalUrl = res.url || url
    if (res.status === 404 || res.status === 410 || res.status === 451) {
      return { ok: false, finalUrl, reason: `HTTP ${res.status}` }
    }
    if (res.status >= 500) {
      return { ok: false, finalUrl, reason: `HTTP ${res.status}` }
    }

    const ct = (res.headers.get('content-type') || '').toLowerCase()
    if (ct.includes('text/html') && res.body) {
      const buf = await res.arrayBuffer()
      const text = new TextDecoder('utf-8').decode(buf.slice(0, 65536)).toLowerCase()
      for (const s of DEAD_SNIPPETS) {
        if (text.includes(s)) return { ok: false, finalUrl, reason: `page indicates closed: ${s}` }
      }
    }

    return { ok: true, finalUrl }
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'timeout' : (e?.message || 'fetch failed')
    // Many ATS block automated checks; do not hard-fail the whole digest.
    return { ok: true, finalUrl: url, reason: `verify inconclusive (${msg})` }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Pick up to `limit` jobs that pass URL check and are not in `excludeKeys`.
 * @param {object[]} jobs
 * @param {Set<string>} excludeKeys
 * @param {number} limit
 */
export async function pickVerifiedJobs(jobs, excludeKeys, limit = 2) {
  const out = []
  for (const job of jobs) {
    if (out.length >= limit) break
    const key = jobFingerprint(job)
    if (!key || excludeKeys.has(key)) continue

    const v = await verifyJobPostingUrl(job.url)
    if (!v.ok) continue

    out.push({ ...job, url: v.finalUrl || job.url })
  }
  return out
}
