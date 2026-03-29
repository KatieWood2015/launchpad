import Anthropic from '@anthropic-ai/sdk'
import { callWithRetry } from './rateLimitHelper.js'
import { Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat, BorderStyle } from 'docx'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function tailorResume(profile, job, outputDir) {
  const client = new Anthropic({ apiKey: profile.anthropicApiKey })

  const response = await callWithRetry(() => client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Reorder and trim resume bullets for: ${job.title} at ${job.company}. Requirements: ${job.keyRequirements.join(', ')}. Copy bullets EXACTLY, only reorder/remove to fit 1 page.

RESUME:
${profile.resumeText}

Return ONLY JSON:
{"sections":[{"type":"header","name":"...","email":"...","phone":"...","address":"..."},{"type":"sectionTitle","text":"EDUCATION"},{"type":"role","company":"...","title":"...","location":"...","dates":"...","bullets":["exact bullet"]}],"bulletsRemoved":3,"removalReason":"brief"}`
    }]
  }))

  let structured
  try {
    const text = response.content[0].text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    structured = JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error('Failed to parse tailored resume:', e)
    return null
  }

  return generateResumeDocx(structured, job, outputDir)
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
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `${section.email}  |  ${section.phone}  |  ${section.address}`, size: 18, font: 'Calibri' })]
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
