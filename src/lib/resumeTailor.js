import Anthropic from '@anthropic-ai/sdk'
import { callWithRetry } from './rateLimitHelper.js'
import { Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat, BorderStyle } from 'docx'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function tailorResume(profile, job, outputDir) {
  const client = new Anthropic({ apiKey: profile.anthropicApiKey })
  const requirements = Array.isArray(job?.keyRequirements) ? job.keyRequirements : []
  const prompt = `You are formatting a resume into structured JSON. The output must fit on ONE page.

TARGET JOB: ${job.title} at ${job.company}. Requirements: ${requirements.join(', ')}

THE ONLY CHANGE YOU MAY MAKE:
- Remove some bullet points from work experience roles to fit one page
- Remove the LEAST relevant bullets to the target job first
- You may remove up to 30% of bullets if needed

YOU MUST NOT:
- Rewrite, rephrase, paraphrase, or change ANY text — every word must be copied exactly
- Change the order of sections, roles, or bullets
- Remove or change ANY section headers, company names, job titles, dates, or locations
- Remove ANY education entries, skills, certifications, or non-bullet content
- Add ANY text that does not appear in the original resume
- Change contact information in any way

RESUME TO FORMAT:
${profile.resumeText}

Return ONLY JSON. Every string value must be copied VERBATIM from the resume above:
{"sections":[{"type":"header","name":"...","email":"...","phone":"...","linkedin":"...","address":"..."},{"type":"sectionTitle","text":"EXACT SECTION HEADER AS IT APPEARS"},{"type":"education","school":"...","degree":"...","location":"...","dates":"...","details":["exact detail"]},{"type":"role","company":"...","title":"...","location":"...","dates":"...","bullets":["exact bullet copied verbatim"]},{"type":"skills","text":"exact skills text as it appears"}],"bulletsRemoved":0,"removalReason":"which bullets were removed and why"}`
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await callWithRetry(() => client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    }))

    try {
      const text = response.content[0].text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const structured = JSON.parse(jsonMatch[0])
      if (!Array.isArray(structured?.sections)) {
        throw new Error('Invalid resume structure: sections must be an array')
      }
      try {
        return await generateResumeDocx(structured, job, outputDir)
      } catch (error) {
        console.error('Failed to generate tailored resume docx:', error)
        return null
      }
    } catch (e) {
      if (attempt === 2) {
        console.error('Failed to parse tailored resume:', e)
        return null
      }
    }
  }

  return null
}

async function generateResumeDocx(structured, job, outputDir) {
  const children = []
  const numberingConfig = [{
    reference: 'bullets',
    levels: [{
      level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 360, hanging: 360 } } }
    }]
  }]

  for (const section of structured.sections) {
    if (section.type === 'header') {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: section.name, bold: true, size: 28, font: 'Calibri' })]
      }))
      const contactParts = [section.email, section.phone, section.linkedin, section.address].filter(Boolean)
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: contactParts.join('  |  '), size: 18, font: 'Calibri' })]
      }))
      children.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
        children: []
      }))
    } else if (section.type === 'sectionTitle') {
      children.push(new Paragraph({
        spacing: { before: 120, after: 60 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: '000000' } },
        children: [new TextRun({ text: section.text, bold: true, size: 20, font: 'Calibri', allCaps: true })]
      }))
    } else if (section.type === 'education') {
      children.push(new Paragraph({
        spacing: { before: 100, after: 0 },
        tabStops: [{ type: 'right', position: 9360 }],
        children: [
          new TextRun({ text: section.school, bold: true, size: 20, font: 'Calibri' }),
          new TextRun({ text: `\t${section.dates || ''}`, size: 20, font: 'Calibri' })
        ]
      }))
      if (section.degree) {
        children.push(new Paragraph({
          spacing: { before: 0, after: 40 },
          tabStops: [{ type: 'right', position: 9360 }],
          children: [
            new TextRun({ text: section.degree, italics: true, size: 20, font: 'Calibri' }),
            new TextRun({ text: section.location ? `\t${section.location}` : '', size: 20, font: 'Calibri', italics: true })
          ]
        }))
      }
      for (const detail of (section.details || [])) {
        children.push(new Paragraph({
          spacing: { before: 0, after: 20 },
          children: [new TextRun({ text: detail, size: 18, font: 'Calibri' })]
        }))
      }
    } else if (section.type === 'role') {
      children.push(new Paragraph({
        spacing: { before: 100, after: 0 },
        tabStops: [{ type: 'right', position: 9360 }],
        children: [
          new TextRun({ text: section.company, bold: true, size: 20, font: 'Calibri' }),
          new TextRun({ text: `\t${section.dates}`, size: 20, font: 'Calibri' })
        ]
      }))
      children.push(new Paragraph({
        spacing: { before: 0, after: 60 },
        tabStops: [{ type: 'right', position: 9360 }],
        children: [
          new TextRun({ text: section.title, italics: true, size: 20, font: 'Calibri' }),
          new TextRun({ text: `\t${section.location}`, size: 20, font: 'Calibri', italics: true })
        ]
      }))
      for (const bullet of (section.bullets || [])) {
        children.push(new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { before: 0, after: 40 },
          children: [new TextRun({ text: bullet, size: 18, font: 'Calibri' })]
        }))
      }
    } else if (section.type === 'skills') {
      children.push(new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: section.text, size: 18, font: 'Calibri' })]
      }))
    }
  }

  const doc = new Document({
    numbering: { config: numberingConfig },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 720, right: 1080, bottom: 720, left: 1080 }
        }
      },
      children
    }]
  })

  const filename = `resume_${job.company.replace(/\s+/g, '_')}_${job.title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
  const outputPath = path.join(outputDir, filename)
  const buffer = await Packer.toBuffer(doc)
  await writeFile(outputPath, buffer)
  return outputPath
}
