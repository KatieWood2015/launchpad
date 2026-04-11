import { NextResponse } from 'next/server'
import { ensureOutputDir } from '../../../lib/paths.js'
import { loadProfile, saveProfile } from '../../../lib/profileStore.js'
import { pickVerifiedJobs, recentJobUrlKeys, recordSentJobs } from '../../../lib/jobPostingVerify.js'

export async function POST(request) {
  try {
    let profile
    try {
      const body = await request.json()
      if (body?.profile) {
        profile = body.profile
      }
    } catch {}

    if (!profile) {
      profile = await loadProfile()
      if (!profile) {
        return NextResponse.json(
          { ok: false, error: 'No saved profile found. Complete setup first.' },
          { status: 400 }
        )
      }
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

    const excludeKeys = recentJobUrlKeys(profile, 14)
    let jobResults = await findJobs(profile, { excludeUrlKeys: excludeKeys, extraSlots: 4 })
    if (!jobResults.jobs?.length) {
      return NextResponse.json({
        ok: false,
        error: 'No matching jobs found today. This can happen if careers pages have changed. Try again or add more target companies in setup.'
      })
    }

    let selected = await pickVerifiedJobs(jobResults.jobs, excludeKeys, 2)
    if (!selected.length) {
      jobResults = await findJobs(profile, { excludeUrlKeys: excludeKeys, extraSlots: 8 })
      selected = await pickVerifiedJobs(jobResults?.jobs || [], excludeKeys, 2)
    }
    if (!selected.length) {
      return NextResponse.json({
        ok: false,
        error: 'Could not verify any live job postings today (URLs may be stale or blocked). Try again later or broaden target companies.',
      })
    }

    const delay = (ms) => new Promise(r => setTimeout(r, ms))

    const processedJobs = []
    try {
      for (const job of selected) {
        // Run sequentially to stay under rate limits
        const resumePath = await tailorResume(profile, job, outputDir)
        const coverLetterPath = await tailorCoverLetter(profile, job, outputDir)
        await delay(5000)
        const outreach = await findOutreachTargets(profile, job)
        processedJobs.push({ ...job, resumePath, coverLetterPath, outreach })
        if (processedJobs.length < selected.length) {
          await delay(10000)
        }
      }

      await sendDigest(profile, { jobs: processedJobs, date: today })
      return NextResponse.json({ ok: true, jobCount: processedJobs.length })
    } finally {
      if (processedJobs.length) {
        recordSentJobs(profile, processedJobs)
        await saveProfile(profile)
      }
    }
  } catch (error) {
    console.error('Daily run error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
