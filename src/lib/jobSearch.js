import Anthropic from '@anthropic-ai/sdk'
import { callWithRetry } from './rateLimitHelper.js'
import { jobFingerprint } from './jobPostingVerify.js'

export async function findJobs(profile, options = {}) {
  const { excludeUrlKeys = new Set(), extraSlots = 0 } = options
  const client = new Anthropic({ apiKey: profile.anthropicApiKey })
  const companies = Array.isArray(profile?.targetCompanies) ? profile.targetCompanies : []
  const companiesList = companies.slice(0, 5).join(', ')
  const excludeList = [...excludeUrlKeys].filter(Boolean).slice(0, 40)

  const searchResponse = await callWithRetry(() => client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
    messages: [{
      role: 'user',
      content: `You are a job search assistant. Search for CURRENTLY OPEN roles matching this candidate.

CANDIDATE:
- Roles: ${profile.targetRoles}
- Location: ${profile.location} (${profile.remotePreference})
- Level: ${profile.levelPreference}
- Min salary: $${parseInt(profile.minSalary).toLocaleString()}
- Background: ${profile.resumeText ? profile.resumeText.slice(0, 500) : profile.whyStatement}

COMPANIES TO SEARCH: ${companiesList}

RECENTLY EMAILED (do NOT return these again; find different postings):
${excludeList.length ? excludeList.map((k) => `- ${k}`).join('\n') : '- (none)'}

CRITICAL RULES:
- ONLY include jobs that are CURRENTLY accepting applications as of today (${new Date().toISOString().split('T')[0]})
- The job posting URL must be a live, active listing — do NOT include expired, closed, or filled positions
- If a posting says "no longer accepting applications", "closed", or has a past deadline, SKIP it
- Verify each posting is live by checking the careers page directly
- For each job, calculate a matchScore (0-100%) using this rubric:
  * Years of experience: Does the candidate meet the required years? (0-25 points)
  * Core skills match: How many of the required skills/tools does the candidate have? (0-30 points)
  * Role relevance: Has the candidate held similar roles or done similar work? (0-25 points)
  * Level fit: Does the seniority level match? (0-10 points)
  * Location/remote fit: Does the location preference align? (0-10 points)
  Be honest — if the candidate lacks required experience, score LOW. A 90%+ should mean the candidate meets nearly all requirements.

INSTRUCTIONS:
1. Search each company's careers/jobs page for open ${profile.targetRoles} positions
2. Verify the posting is currently live and accepting applications
3. If a company has no current matching roles, move to the next one
4. Also search for similar companies with matching roles
5. Return the TOP ${2 + extraSlots} best-matching LIVE roles you find (sorted best-first). The app will pick the first two that pass automated URL checks and are not in RECENTLY EMAILED.

Return ONLY valid JSON, no other text:
{"jobs":[{"company":"Company Name","title":"Job Title","url":"https://link-to-posting","location":"City, State or Remote","salary":"range or null","description":"2-3 sentence summary","keyRequirements":["req1","req2","req3"],"whyMatch":"Why this fits the candidate","matchScore":85,"isNewCompany":false}],"suggestedCompanies":["Similar Company A","Similar Company B"],"searchDate":"${new Date().toISOString().split('T')[0]}"}`
    }]
  }))

  let responseText = ''
  for (const block of searchResponse.content) {
    if (block.type === 'text') responseText += block.text
  }

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const jobs = Array.isArray(parsed?.jobs) ? parsed.jobs : []
      const filtered = jobs.filter((j) => {
        const key = jobFingerprint(j)
        return key && !excludeUrlKeys.has(key)
      })
      return { ...parsed, jobs: filtered }
    }
  } catch (e) {
    console.error('Failed to parse job search results:', e)
  }

  return { jobs: [], suggestedCompanies: [], searchDate: new Date().toISOString().split('T')[0] }
}
