import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { appendFileSync, mkdirSync } from 'fs'
import { getProfilePath, ensureOutputDir } from '../../../lib/paths.js'

function debugLog(payload) {
  try {
    mkdirSync('/opt/cursor/logs', { recursive: true })
    appendFileSync('/opt/cursor/logs/debug.log', JSON.stringify(payload) + '\n')
  } catch {}
}

export async function POST(request) {
  try {
    let profile
    // #region agent log
    debugLog({ hypothesisId: 'H3', location: 'src/app/api/run-daily/route.js:9', message: 'run-daily POST entry', data: { profilePath: getProfilePath() }, timestamp: Date.now() })
    // #endregion
    try {
      const body = await request.json()
      if (body?.profile) {
        profile = body.profile
        // #region agent log
        debugLog({ hypothesisId: 'H3', location: 'src/app/api/run-daily/route.js:15', message: 'run-daily using request body profile', data: { hasName: !!profile?.name, hasEmail: !!profile?.email }, timestamp: Date.now() })
        // #endregion
      }
    } catch {}

    if (!profile) {
      // #region agent log
      debugLog({ hypothesisId: 'H3', location: 'src/app/api/run-daily/route.js:21', message: 'run-daily loading disk profile fallback', data: { profilePath: getProfilePath() }, timestamp: Date.now() })
      // #endregion
      profile = JSON.parse(await readFile(getProfilePath(), 'utf8'))
      // #region agent log
      debugLog({ hypothesisId: 'H3', location: 'src/app/api/run-daily/route.js:24', message: 'run-daily loaded profile from disk', data: { name: profile?.name || null, email: profile?.email || null, targetCompaniesType: typeof profile?.targetCompanies }, timestamp: Date.now() })
      // #endregion
    }

    // Inject server-side secrets (never trust client-sent credentials)
    profile.anthropicApiKey = process.env.ANTHROPIC_API_KEY
    profile.gmailUser = process.env.GMAIL_USER
    profile.gmailAppPassword = process.env.GMAIL_APP_PASSWORD

    const { findJobs } = await import('../../../lib/jobSearch.js')
    const { tailorResume } = await import('../../../lib/resumeTailor.js')
    const { tailorCoverLetter, findOutreachTargets, sendDigest } = await import('../../../lib/pipeline.js')

    const today = new Date().toISOString().split('T')[0]
    const outputDir = await ensureOutputDir(today)

    const jobResults = await findJobs(profile)
    if (!jobResults.jobs?.length) {
      return NextResponse.json({
        ok: false,
        error: 'No matching jobs found today. This can happen if careers pages have changed. Try again or add more target companies in setup.'
      })
    }

    const delay = (ms) => new Promise(r => setTimeout(r, ms))

    const processedJobs = []
    for (const job of jobResults.jobs.slice(0, 2)) {
      // Run sequentially to stay under rate limits
      const resumePath = await tailorResume(profile, job, outputDir)
      const coverLetterPath = await tailorCoverLetter(profile, job, outputDir)
      await delay(5000)
      const outreach = await findOutreachTargets(profile, job)
      processedJobs.push({ ...job, resumePath, coverLetterPath, outreach })
      if (processedJobs.length < jobResults.jobs.slice(0, 2).length) {
        await delay(10000)
      }
    }

    await sendDigest(profile, { jobs: processedJobs, date: today })

    return NextResponse.json({ ok: true, jobCount: processedJobs.length })
  } catch (error) {
    // #region agent log
    debugLog({ hypothesisId: 'H3', location: 'src/app/api/run-daily/route.js:63', message: 'run-daily error', data: { error: error?.message || 'unknown' }, timestamp: Date.now() })
    // #endregion
    console.error('Daily run error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
