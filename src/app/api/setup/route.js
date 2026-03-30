import { NextResponse } from 'next/server'
import { writeFile, readFile } from 'fs/promises'
import { appendFileSync, mkdirSync } from 'fs'
import path from 'path'
import { ensureConfigDir, getProfilePath } from '../../../lib/paths.js'

function debugLog(payload) {
  try {
    mkdirSync('/opt/cursor/logs', { recursive: true })
    appendFileSync('/opt/cursor/logs/debug.log', JSON.stringify(payload) + '\n')
  } catch {}
}

export async function GET() {
  try {
    const raw = await readFile(getProfilePath(), 'utf8')
    const profile = JSON.parse(raw)
    const { anthropicApiKey, gmailUser, gmailAppPassword, ...clientProfile } = profile
    return NextResponse.json({ ok: true, profile: clientProfile })
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ ok: true, profile: null })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    // #region agent log
    debugLog({ hypothesisId: 'H1', location: 'src/app/api/setup/route.js:10', message: 'setup POST entry', data: { hasResume: !!formData.get('resume'), fieldsPresent: ['name', 'email', 'digestEmail'].map(k => !!formData.get(k)) }, timestamp: Date.now() })
    // #endregion

    let existingProfile = null
    try {
      existingProfile = JSON.parse(await readFile(getProfilePath(), 'utf8'))
    } catch {}

    // Extract text fields
    const profile = {
      name: formData.get('name'),
      email: formData.get('email'),
      whyStatement: formData.get('whyStatement'),
      targetRoles: formData.get('targetRoles'),
      location: formData.get('location'),
      remotePreference: formData.get('remotePreference'),
      minSalary: formData.get('minSalary'),
      levelPreference: formData.get('levelPreference'),
      culturePriorities: formData.get('culturePriorities'),
      industriesToAvoid: formData.get('industriesToAvoid'),
      targetCompanies: formData.get('targetCompanies')
        ?.split(',').map(c => c.trim()).filter(Boolean),
      coverLetterText: formData.get('coverLetterText'),
      digestEmail: formData.get('digestEmail'),
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      gmailUser: process.env.GMAIL_USER,
      gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
      unsubscribeToken: existingProfile?.unsubscribeToken || (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)),
      paused: existingProfile?.paused ?? false,
    }

    // Handle resume file
    const resumeFile = formData.get('resume')
    if (resumeFile && resumeFile.size > 0) {
      const configDir = await ensureConfigDir()

      const bytes = await resumeFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const ext = resumeFile.name.endsWith('.pdf') ? '.pdf' : '.docx'
      const resumePath = path.join(configDir, `resume${ext}`)
      await writeFile(resumePath, buffer)
      profile.resumePath = resumePath
      profile.resumeFileName = resumeFile.name

      // Extract text from resume for AI processing
      profile.resumeText = await extractResumeText(resumePath, ext)
    } else if (existingProfile?.resumePath) {
      profile.resumePath = existingProfile.resumePath
      profile.resumeFileName = existingProfile.resumeFileName
      profile.resumeText = existingProfile.resumeText
    }

    // Save profile to disk (works locally and in GitHub Actions)
    await ensureConfigDir()
    // #region agent log
    debugLog({ hypothesisId: 'H1', location: 'src/app/api/setup/route.js:53', message: 'writing profile to disk', data: { profilePath: getProfilePath(), name: profile.name || null, email: profile.email || null }, timestamp: Date.now() })
    // #endregion
    await writeFile(getProfilePath(), JSON.stringify(profile, null, 2))
    // #region agent log
    debugLog({ hypothesisId: 'H1', location: 'src/app/api/setup/route.js:56', message: 'profile write complete', data: { profilePath: getProfilePath(), targetCompaniesCount: Array.isArray(profile.targetCompanies) ? profile.targetCompanies.length : 0 }, timestamp: Date.now() })
    // #endregion

    // Return profile (without secrets) so the client can store it for later use.
    // On Vercel, /tmp is ephemeral and may not survive between requests.
    const { anthropicApiKey, gmailUser, gmailAppPassword, ...clientProfile } = profile
    return NextResponse.json({ ok: true, profile: clientProfile })
  } catch (error) {
    // #region agent log
    debugLog({ hypothesisId: 'H1', location: 'src/app/api/setup/route.js:63', message: 'setup POST error', data: { error: error?.message || 'unknown' }, timestamp: Date.now() })
    // #endregion
    console.error('Setup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function extractResumeText(filePath, ext) {
  try {
    if (ext === '.pdf') {
      const pdfParse = (await import('pdf-parse')).default
      const fs = await import('fs')
      const dataBuffer = fs.readFileSync(filePath)
      const data = await pdfParse(dataBuffer)
      return data.text
    } else if (ext === '.docx') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ path: filePath })
      return result.value
    }
  } catch (e) {
    console.error('Resume text extraction failed:', e)
    return ''
  }
  return ''
}
