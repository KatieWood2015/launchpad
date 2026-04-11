#!/usr/bin/env node
/**
 * LAUNCHPAD - Daily Runner (GitHub Actions)
 * node src/lib/daily.js
 */

import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { findJobs } from './jobSearch.js'
import { tailorResume } from './resumeTailor.js'
import { tailorCoverLetter, findOutreachTargets, sendDigest } from './pipeline.js'
import { loadProfile, saveProfile } from './profileStore.js'
import { pickVerifiedJobs, recentJobUrlKeys, recordSentJobs } from './jobPostingVerify.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function run() {
  console.log('\n🚀 LAUNCHPAD — Daily Run')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const profile = await loadProfile()
  if (!profile) {
    throw new Error('No profile found in database or config/profile.json')
  }
  // Prefer runtime environment secrets when available.
  profile.anthropicApiKey = process.env.ANTHROPIC_API_KEY || profile.anthropicApiKey
  profile.gmailUser = process.env.GMAIL_USER || profile.gmailUser
  profile.gmailAppPassword = process.env.GMAIL_APP_PASSWORD || profile.gmailAppPassword
  if (!profile.anthropicApiKey || !profile.gmailUser || !profile.gmailAppPassword) {
    throw new Error('Missing credentials: set ANTHROPIC_API_KEY, GMAIL_USER, and GMAIL_APP_PASSWORD')
  }
  console.log(`👤 ${profile.name}`)

  const today = new Date().toISOString().split('T')[0]
  const outputDir = path.join(__dirname, '../../output', today)
  await mkdir(outputDir, { recursive: true })

  console.log('🔍 Searching for jobs...')
  const excludeKeys = recentJobUrlKeys(profile, 14)
  let jobResults = await findJobs(profile, { excludeUrlKeys: excludeKeys, extraSlots: 4 })

  if (!jobResults.jobs?.length) {
    console.log('⚠️  No matching jobs found today.')
    return
  }

  let selected = await pickVerifiedJobs(jobResults.jobs, excludeKeys, 2)
  if (!selected.length) {
    jobResults = await findJobs(profile, { excludeUrlKeys: excludeKeys, extraSlots: 8 })
    selected = await pickVerifiedJobs(jobResults?.jobs || [], excludeKeys, 2)
  }
  if (!selected.length) {
    console.log('⚠️  No verifiable live job postings today (URLs stale or blocked).')
    return
  }

  console.log(`✅ Selected ${selected.length} verified job(s)\n`)

  const processedJobs = []
  try {
    for (const job of selected) {
      console.log(`📋 Processing: ${job.title} at ${job.company}`)
      const [resumePath, coverLetterPath, outreach] = await Promise.all([
        tailorResume(profile, job, outputDir),
        tailorCoverLetter(profile, job, outputDir),
        findOutreachTargets(profile, job)
      ])
      processedJobs.push({ ...job, resumePath, coverLetterPath, outreach })
    }

    console.log('\n📧 Sending digest...')
    await sendDigest(profile, { jobs: processedJobs, date: today })
    console.log('✅ Done!\n')
  } finally {
    if (processedJobs.length) {
      recordSentJobs(profile, processedJobs)
      await saveProfile(profile)
    }
  }
}

run().catch(err => {
  console.error('❌ Failed:', err.message)
  process.exit(1)
})
