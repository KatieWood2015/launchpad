import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request) {
  try {
    const formData = await request.formData()

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
      anthropicApiKey: formData.get('anthropicApiKey'),
      gmailUser: formData.get('gmailUser'),
      gmailAppPassword: formData.get('gmailAppPassword'),
      digestEmail: formData.get('digestEmail'),
    }

    // Handle resume file
    const resumeFile = formData.get('resume')
    if (resumeFile && resumeFile.size > 0) {
      const configDir = path.join(process.cwd(), 'config')
      await mkdir(configDir, { recursive: true })

      const bytes = await resumeFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const ext = resumeFile.name.endsWith('.pdf') ? '.pdf' : '.docx'
      const resumePath = path.join(configDir, `resume${ext}`)
      await writeFile(resumePath, buffer)
      profile.resumePath = resumePath
      profile.resumeFileName = resumeFile.name

      // Extract text from resume for AI processing
      profile.resumeText = await extractResumeText(resumePath, ext)
    }

    // Save profile
    const configDir = path.join(process.cwd(), 'config')
    await mkdir(configDir, { recursive: true })
    await writeFile(
      path.join(configDir, 'profile.json'),
      JSON.stringify(profile, null, 2)
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
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
