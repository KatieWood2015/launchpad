import Anthropic from '@anthropic-ai/sdk'
import { callWithRetry } from './rateLimitHelper.js'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'

// ─── COVER LETTER ────────────────────────────────────────────────────────────

export async function tailorCoverLetter(profile, job, outputDir) {
  const client = new Anthropic({ apiKey: profile.anthropicApiKey })

  const response = await callWithRetry(() => client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Create a tailored cover letter for ${profile.name} applying to ${job.title} at ${job.company}.

JOB: ${job.title} at ${job.company}. ${job.description}. Requirements: ${job.keyRequirements.join(', ')}

CANDIDATE BACKGROUND: ${profile.whyStatement}

TEMPLATE PARAGRAPHS (select best 3-4 and replace [COMPANY] with "${job.company}" and [ROLE] with "${job.title}"):
${profile.coverLetterText}

INSTRUCTIONS:
1. Write an "introParagraph": a 2-3 sentence opening that introduces ${profile.name}, states they are applying for the ${job.title} role at ${job.company}, and briefly explains why they are excited about this opportunity
2. Select the best 3-4 paragraphs from the template. For each, add a strong topic sentence at the beginning that connects the paragraph's content to the specific role requirements. Do NOT rewrite the rest of the paragraph — only add the topic sentence and swap [COMPANY]/[ROLE] placeholders.
3. Include a closing

Return ONLY JSON:
{"salutation":"Dear Hiring Team at ${job.company},","introParagraph":"2-3 sentence intro about who ${profile.name} is and why they're applying for this role","paragraphs":["topic sentence + template paragraph 1","topic sentence + template paragraph 2","topic sentence + template paragraph 3"],"closing":"Sincerely,","candidateName":"${profile.name}"}`
    }]
  }))

  let structured
  try {
    const text = response.content[0].text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    structured = JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error('Failed to parse cover letter:', e)
    return null
  }

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const children = [
    new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: today, size: 22, font: 'Calibri' })] }),
    new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: structured.salutation, size: 22, font: 'Calibri' })] }),
  ]
  if (structured.introParagraph) {
    children.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: structured.introParagraph, size: 22, font: 'Calibri' })] }))
  }
  children.push(
    ...structured.paragraphs.map(para =>
      new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: para, size: 22, font: 'Calibri' })] })
    ),
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: structured.closing, size: 22, font: 'Calibri' })] }),
    new Paragraph({ children: [new TextRun({ text: structured.candidateName, size: 22, font: 'Calibri' })] })
  )

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children
    }]
  })

  const filename = `cover_letter_${job.company.replace(/\s+/g, '_')}.docx`
  const outputPath = path.join(outputDir, filename)
  await writeFile(outputPath, await Packer.toBuffer(doc))
  return outputPath
}

// ─── OUTREACH ─────────────────────────────────────────────────────────────────

export async function findOutreachTargets(profile, job) {
  const client = new Anthropic({ apiKey: profile.anthropicApiKey })

  const response = await callWithRetry(() => client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
    messages: [{
      role: 'user',
      content: `Find 2 LinkedIn contacts at ${job.company} for a ${job.title} role: 1 recruiter, 1 hiring manager. Draft short connection messages (<300 chars) from ${profile.name}.

Return ONLY JSON:
{"contacts":[{"name":"Name","title":"Title","type":"recruiter|hiring_manager|peer","linkedinUrl":"url or null","whyReach":"one sentence","message":"short message"}],"searchNote":"brief"}`
    }]
  }))

  try {
    let text = ''
    for (const block of response.content) {
      if (block.type === 'text') text += block.text
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    return { contacts: [], searchNote: 'Search failed — try manual LinkedIn search' }
  }
}

// ─── EMAIL DIGEST ─────────────────────────────────────────────────────────────

export async function sendDigest(profile, { jobs, date }) {
  // Don't send if paused
  if (profile.paused) {
    console.log('Digest skipped — emails paused by user')
    return
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: profile.gmailUser, pass: profile.gmailAppPassword }
  })

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  let html = `<!DOCTYPE html><html><head><style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;background:#f9f9f9;}
    .wrap{background:#fff;border-radius:12px;overflow:hidden;margin:20px auto;}
    .hdr{background:#0a0a0a;color:#fff;padding:28px 32px;}
    .hdr h1{margin:0;font-size:22px;letter-spacing:-0.3px;}
    .hdr p{margin:6px 0 0;color:#888;font-size:13px;}
    .body{padding:28px 32px;}
    .job{border:1px solid #e8e8e8;border-radius:10px;margin-bottom:24px;overflow:hidden;}
    .jh{background:#fafafa;padding:18px 22px;border-bottom:1px solid #e8e8e8;}
    .jh h2{margin:0;font-size:17px;color:#0a0a0a;}
    .jh .sub{color:#666;font-size:13px;margin-top:4px;}
    .jb{padding:18px 22px;}
    .match{background:#f0fdf4;border-left:3px solid #22c55e;padding:10px 14px;border-radius:0 6px 6px 0;font-size:13px;margin:12px 0;color:#166534;}
    .tag{display:inline-block;background:#f0f0f0;border-radius:4px;padding:2px 8px;font-size:11px;margin:2px;color:#444;}
    .label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#aaa;margin:16px 0 8px;}
    .contact{border:1px solid #eee;border-radius:8px;padding:14px;margin:8px 0;}
    .msg{background:#f9f9f9;border-radius:6px;padding:10px;margin-top:8px;font-size:12px;font-style:italic;color:#555;}
    .btn{display:inline-block;background:#0a0a0a;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:700;margin-top:12px;}
    .lnk{color:#0077b5;font-size:12px;text-decoration:none;}
    .footer{text-align:center;color:#bbb;font-size:11px;padding:20px;}
  </style></head><body><div class="wrap">
  <div class="hdr"><h1>🚀 Launchpad</h1><p>${formattedDate} · ${jobs.length} match${jobs.length !== 1 ? 'es' : ''} found</p></div>
  <div class="body">`

  const attachments = []

  for (const job of jobs) {
    const score = job.matchScore || null
    const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#f97316'
    html += `<div class="job">
      <div class="jh"><h2>${job.title}${score ? `<span style="float:right;background:${scoreColor};color:#fff;border-radius:12px;padding:2px 10px;font-size:12px;font-weight:700;">${score}% match</span>` : ''}</h2>
        <div class="sub">${job.company} · ${job.location}${job.salary ? ` · ${job.salary}` : ''}</div>
      </div>
      <div class="jb">
        <p style="font-size:14px;color:#444;line-height:1.6;">${job.description}</p>
        <div class="match"><strong>Why this matches you:</strong> ${job.whyMatch}</div>
        <div class="label">Key Requirements</div>
        <div>${job.keyRequirements.map(r => `<span class="tag">${r}</span>`).join('')}</div>
        <a href="${job.url}" class="btn" style="color:#ffffff;font-weight:700;">View posting →</a>
        <div class="label">Tailored Documents (attached)</div>
        <div style="font-size:13px;color:#555;">
          📄 resume_${job.company.replace(/\s+/g, '_')}.docx<br>
          ✉️ cover_letter_${job.company.replace(/\s+/g, '_')}.docx
        </div>`

    if (job.outreach?.contacts?.length) {
      html += `<div class="label">LinkedIn Outreach</div>`
      for (const c of job.outreach.contacts) {
        const emoji = c.type === 'recruiter' ? '🎯' : c.type === 'hiring_manager' ? '👔' : '🤝'
        html += `<div class="contact">
          <strong>${emoji} ${c.name}</strong> — <span style="font-size:13px;color:#666;">${c.title}</span>
          <div class="msg">"${c.message}"</div>
          ${c.linkedinUrl ? `<a href="${c.linkedinUrl}" class="lnk">View profile →</a>` : '<span style="font-size:12px;color:#aaa;">Search on LinkedIn</span>'}
        </div>`
      }
    }

    html += `</div></div>`

    if (job.resumePath && existsSync(job.resumePath)) {
      attachments.push({ filename: path.basename(job.resumePath), content: await readFile(job.resumePath) })
    }
    if (job.coverLetterPath && existsSync(job.coverLetterPath)) {
      attachments.push({ filename: path.basename(job.coverLetterPath), content: await readFile(job.coverLetterPath) })
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const settingsUrl = `${baseUrl}/settings?token=${profile.unsubscribeToken}`
  const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${profile.unsubscribeToken}&action=pause`

  html += `</div><div class="footer">
    Launchpad · Your personal job search assistant<br>
    <a href="${settingsUrl}" style="color:#aaa;">Manage preferences</a> &nbsp;·&nbsp;
    <a href="${unsubscribeUrl}" style="color:#aaa;">Unsubscribe</a>
  </div></div></body></html>`

  await transporter.sendMail({
    from: `Launchpad <${profile.gmailUser}>`,
    to: profile.digestEmail,
    subject: `🚀 Launchpad: ${jobs.length} match${jobs.length !== 1 ? 'es' : ''} · ${formattedDate}`,
    html,
    attachments
  })
}
