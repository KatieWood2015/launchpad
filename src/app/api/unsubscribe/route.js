import { NextResponse } from 'next/server'
import { loadProfile, patchProfile } from '../../../lib/profileStore.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const action = searchParams.get('action') || 'pause'

    const profile = await loadProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Validate token
    if (token !== profile.unsubscribeToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    await patchProfile((current) => {
      if (action === 'pause') {
        current.paused = true
      } else if (action === 'resume') {
        current.paused = false
      }
      return current
    })

    // Redirect to settings page with status
    const base = request.nextUrl.origin
    return NextResponse.redirect(`${base}/settings?status=${action}&token=${token}`)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
