import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const action = searchParams.get('action') || 'pause'

    const profilePath = path.join(process.cwd(), 'config', 'profile.json')
    const profile = JSON.parse(await readFile(profilePath, 'utf8'))

    // Validate token
    if (token !== profile.unsubscribeToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (action === 'pause') {
      profile.paused = true
    } else if (action === 'resume') {
      profile.paused = false
    }

    await writeFile(profilePath, JSON.stringify(profile, null, 2))

    // Redirect to settings page with status
    const base = request.nextUrl.origin
    return NextResponse.redirect(`${base}/settings?status=${action}&token=${token}`)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
