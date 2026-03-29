import Anthropic from '@anthropic-ai/sdk'

export async function findJobs(profile) {
  const client = new Anthropic({ apiKey: profile.anthropicApiKey })
  // Search only the first 3 target companies to reduce token usage
  const companiesList = profile.targetCompanies.slice(0, 3).join(', ')

  const searchResponse = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
    messages: [{
      role: 'user',
      content: `Find 2 open ${profile.targetRoles} roles at these companies: ${companiesList}. Location: ${profile.location} (${profile.remotePreference}). Level: ${profile.levelPreference}. Min salary: $${parseInt(profile.minSalary).toLocaleString()}.

Search their careers pages. Return ONLY JSON:
{"jobs":[{"company":"Name","title":"Title","url":"link","location":"loc","salary":"range or null","description":"2 sentences","keyRequirements":["r1","r2","r3"],"whyMatch":"1 sentence","isNewCompany":false}],"suggestedCompanies":["A","B"],"searchDate":"${new Date().toISOString().split('T')[0]}"}`
    }]
  })

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
