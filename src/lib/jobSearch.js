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
      content: `You are a job search assistant. Search for open roles matching this candidate.

CANDIDATE: ${profile.targetRoles} roles in ${profile.location} (${profile.remotePreference}). Level: ${profile.levelPreference}. Min salary: $${parseInt(profile.minSalary).toLocaleString()}.

COMPANIES TO SEARCH: ${companiesList}

INSTRUCTIONS:
1. Search each company's careers/jobs page for open ${profile.targetRoles} positions
2. If a company has no matching roles, move to the next one
3. Also search for similar companies with matching roles
4. Return the TOP 2 best-matching roles you find

You MUST return valid JSON with at least 1 job if any relevant role exists at any of these companies. If you truly cannot find any, return an empty jobs array.

Return ONLY valid JSON, no other text:
{"jobs":[{"company":"Company Name","title":"Job Title","url":"https://link-to-posting","location":"City, State or Remote","salary":"range or null","description":"2-3 sentence summary","keyRequirements":["req1","req2","req3"],"whyMatch":"Why this fits the candidate","isNewCompany":false}],"suggestedCompanies":["Similar Company A","Similar Company B"],"searchDate":"${new Date().toISOString().split('T')[0]}"}`
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
