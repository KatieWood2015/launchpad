import Anthropic from '@anthropic-ai/sdk'

export async function findJobs(profile) {
  const client = new Anthropic({ apiKey: profile.anthropicApiKey })
  const companiesList = profile.targetCompanies.join(', ')

  const searchResponse = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{
      role: 'user',
      content: `You are a job search assistant helping find relevant open positions.

CANDIDATE PROFILE:
- Target roles: ${profile.targetRoles}
- Location: ${profile.location} (preference: ${profile.remotePreference})
- Minimum salary: $${parseInt(profile.minSalary).toLocaleString()}
- Level: ${profile.levelPreference}
- Background: Strategy & Analytics, Product-Led Growth, data-driven, cross-functional leadership
- Culture priorities: ${profile.culturePriorities}
- Industries to avoid: ${profile.industriesToAvoid}

TARGET COMPANIES: ${companiesList}

TASK:
1. Search each target company's careers page for open roles matching this profile
2. Suggest 2-3 additional similar companies and search those too
3. Find the TOP 2 best-matching open roles across all companies

Return ONLY valid JSON, no markdown, no explanation:
{
  "jobs": [
    {
      "company": "Company Name",
      "title": "Exact Job Title",
      "url": "Direct link to job posting",
      "location": "City, State or Remote",
      "salary": "Salary range if listed or null",
      "description": "2-3 sentence summary of the role",
      "keyRequirements": ["req 1", "req 2", "req 3"],
      "whyMatch": "1-2 sentences on why this matches this candidate specifically",
      "isNewCompany": false
    }
  ],
  "suggestedCompanies": ["Company A", "Company B"],
  "searchDate": "${new Date().toISOString().split('T')[0]}"
}`
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
