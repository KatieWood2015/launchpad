import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function POST() {
  try {
    // Load profile
    const profilePath = path.join(process.cwd(), 'config', 'profile.json')
    const profile = JSON.parse(await readFile(profilePath, 'utf8'))

    // Run the pipeline (import core modules)
    const { findJobs } = await import('../../../lib/jobSearch.js')
    const { tailorResume } = await import('../../../lib/resumeTailor.js')
    const { tailorCoverLetter } = await import('../../../lib/coverLetter.js')
    const { findOutreachTargets } = await import('../../../lib/outreach.js')
    const { sendDigest } = await import('../../../lib/emailDigest.js')
    const { mkdir } = await import('fs/promises')

    const today = new Date().toISOString().split('T')[0]
    const outputDir = path.join(process.cwd(), 'output', today)
    await mkdir(outputDir, { recursive: true })

    // Find jobs
    const jobResults = await findJobs(profile)
    if (!jobResults.jobs?.length) {
      return NextResponse.json({ ok: false, error: 'No jobs found' })
    }

    // Process each job
    const processedJobs = []
    for (const job of jobResults.jobs.slice(0, 2)) {
      const [resumePath, coverLetterPath, outreach] = await Promise.all([
        tailorResume(profile, job, outputDir),
        tailorCoverLetter(profile, job, outputDir),
        findOutreachTargets(profile, job)
      ])
      processedJobs.push({ ...job, resumePath, coverLetterPath, outreach })
    }

    // Send digest
    await sendDigest(profile, { jobs: processedJobs, date: today })

    return NextResponse.json({ ok: true, jobCount: processedJobs.length })
  } catch (error) {
    console.error('Daily run error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
