import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { getProfilePath, ensureOutputDir } from '../../../lib/paths.js'

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
      profile = JSON.parse(await readFile(getProfilePath(), 'utf8'))
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
    console.error('Daily run error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
