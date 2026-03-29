import Anthropic from '@anthropic-ai/sdk'
import { callWithRetry } from './rateLimitHelper.js'

export async function findJobs(profile) {
  const client = new Anthropic({ apiKey: profile.anthropicApiKey })
  const companiesList = profile.targetCompanies.slice(0, 5).join(', ')

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

CRITICAL RULES:
- ONLY include jobs that are CURRENTLY accepting applications as of today (${new Date().toISOString().split('T')[0]})
- The job posting URL must be a live, active listing — do NOT include expired, closed, or filled positions
- If a posting says "no longer accepting applications", "closed", or has a past deadline, SKIP it
- Verify each posting is live by checking the careers page directly
- For each job, estimate a match percentage (0-100%) based on how well the candidate's background fits the role requirements

INSTRUCTIONS:
1. Search each company's careers/jobs page for open ${profile.targetRoles} positions
2. Verify the posting is currently live and accepting applications
3. If a company has no current matching roles, move to the next one
4. Also search for similar companies with matching roles
5. Return the TOP 2 best-matching LIVE roles you find

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
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error('Failed to parse job search results:', e)
  }

  return { jobs: [], suggestedCompanies: [], searchDate: new Date().toISOString().split('T')[0] }
}
