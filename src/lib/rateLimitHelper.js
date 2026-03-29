/**
 * Calls an async function with automatic retry on 429 rate limit errors.
 * Waits 60 seconds between retries since the rate limit is per-minute.
 */
export async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const isRateLimit = error?.status === 429 ||
        error?.message?.includes('rate_limit') ||
        error?.error?.type === 'rate_limit_error'

      if (isRateLimit && attempt < maxRetries) {
        const waitSec = 65
        console.log(`Rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Waiting ${waitSec}s...`)
        await new Promise(r => setTimeout(r, waitSec * 1000))
        continue
      }
      throw error
    }
  }
}
