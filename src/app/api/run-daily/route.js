import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { getProfilePath, ensureOutputDir } from '../../../lib/paths.js'

export async function POST() {
  try {
    const profile = JSON.parse(await readFile(getProfilePath(), 'utf8'))

    const { findJobs } = await import('../../../lib/jobSearch.js')
    const { tailorResume } = await import('../../../lib/resumeTailor.js')
    const { tailorCoverLetter, findOutreachTargets, sendDigest } = await import('../../../lib/pipeline.js')

    const today = new Date().toISOString().split('T')[0]
    const outputDir = await ensureOutputDir(today)

    const jobResults = await findJobs(profile)
    if (!jobResults.jobs?.length) {
      return NextResponse.json({ ok: false, error: 'No jobs found' })
    }

    const processedJobs = []
    for (const job of jobResults.jobs.slice(0, 2)) {
      const [resumePath, coverLetterPath, outreach] = await Promise.all([
        tailorResume(profile, job, outputDir),
        tailorCoverLetter(profile, job, outputDir),
        findOutreachTargets(profile, job)
      ])
      processedJobs.push({ ...job, resumePath, coverLetterPath, outreach })
    }

    await sendDigest(profile, { jobs: processedJobs, date: today })

    return NextResponse.json({ ok: true, jobCount: processedJobs.length })
  } catch (error) {
    console.error('Daily run error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
