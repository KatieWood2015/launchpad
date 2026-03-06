'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SettingsContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const statusParam = searchParams.get('status')

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(statusParam || '')
  const [digestEmail, setDigestEmail] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!token) { setError('Missing token — use the link from your digest email.'); setLoading(false); return }
    fetch(`/api/settings?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setProfile(data)
        setDigestEmail(data.digestEmail)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [token])

  const doAction = async (action, extra = {}) => {
    setSaving(true)
    setSaved('')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action, ...extra })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProfile(p => ({ ...p, paused: data.paused }))
      setSaved(action)
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const inputStyle = {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6,
    color: '#f0ede8', padding: '10px 14px', fontSize: 14, width: '100%',
    outline: 'none', fontFamily: 'DM Sans, sans-serif',
  }

  const labelStyle = {
    fontSize: 11, fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em',
    textTransform: 'uppercase', color: '#888880', marginBottom: 8, display: 'block',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Nav */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 40px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/">
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18, cursor: 'pointer' }}>🚀 Launchpad</span>
        </Link>
        <span style={{ color: '#333', fontSize: 14 }}>/</span>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#888880' }}>settings</span>
      </div>

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 32, marginBottom: 8 }}>
          Email settings
        </h1>
        <p style={{ color: '#888880', fontSize: 14, marginBottom: 48 }}>
          Manage your Launchpad digest preferences.
        </p>

        {loading && (
          <div style={{ color: '#555550', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>Loading...</div>
        )}

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 8, padding: '16px 20px', color: '#f87171', fontSize: 14
          }}>
            {error}
            {!token && (
              <p style={{ marginTop: 8, fontSize: 12, color: '#f87171', opacity: 0.7 }}>
                Open the link from your digest email to access settings.
              </p>
            )}
          </div>
        )}

        {profile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Status banner */}
            {saved && (
              <div style={{
                background: saved === 'delete' ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.08)',
                border: `1px solid ${saved === 'delete' ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)'}`,
                borderRadius: 8, padding: '12px 16px',
                color: saved === 'delete' ? '#f87171' : '#4ade80', fontSize: 13
              }}>
                {saved === 'pause' && '⏸ Emails paused. You won\'t receive any more digests.'}
                {saved === 'resume' && '▶ Emails resumed! You\'ll get your next digest tomorrow morning.'}
                {saved === 'update' && '✓ Delivery email updated.'}
                {saved === 'delete' && '🗑 Profile deleted. You won\'t receive any more emails.'}
              </div>
            )}

            {/* Current status */}
            <div style={{
              background: '#111111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                    Hi, {profile.name} 👋
                  </div>
                  <div style={{ fontSize: 13, color: '#666660' }}>
                    Digest sent to <span style={{ color: '#f0ede8' }}>{profile.digestEmail}</span>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: profile.paused ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)',
                  border: `1px solid ${profile.paused ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)'}`,
                  borderRadius: 100, padding: '4px 12px'
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: profile.paused ? '#f87171' : '#4ade80',
                    animation: profile.paused ? 'none' : 'pulse 2s infinite'
                  }} />
                  <span style={{
                    fontSize: 11, fontFamily: 'DM Mono, monospace',
                    color: profile.paused ? '#f87171' : '#4ade80',
                    letterSpacing: '0.04em'
                  }}>
                    {profile.paused ? 'PAUSED' : 'ACTIVE'}
                  </span>
                </div>
              </div>

              {/* Pause / Resume */}
              {profile.paused ? (
                <button
                  onClick={() => doAction('resume')}
                  disabled={saving}
                  style={{
                    width: '100%', background: 'rgba(74,222,128,0.1)',
                    border: '1px solid rgba(74,222,128,0.25)', borderRadius: 8,
                    color: '#4ade80', padding: '12px', fontSize: 14, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s'
                  }}
                >
                  {saving ? 'Saving...' : '▶ Resume daily emails'}
                </button>
              ) : (
                <button
                  onClick={() => doAction('pause')}
                  disabled={saving}
                  style={{
                    width: '100%', background: '#1a1a1a',
                    border: '1px solid #2a2a2a', borderRadius: 8,
                    color: '#888880', padding: '12px', fontSize: 14,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s'
                  }}
                >
                  {saving ? 'Saving...' : '⏸ Pause emails'}
                </button>
              )}
            </div>

            {/* Update email */}
            <div style={{
              background: '#111111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '24px'
            }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Update delivery email</div>
              <label style={labelStyle}>Email address</label>
              <input
                style={inputStyle}
                type="email"
                value={digestEmail}
                onChange={e => setDigestEmail(e.target.value)}
              />
              <button
                onClick={() => doAction('update', { digestEmail })}
                disabled={saving || digestEmail === profile.digestEmail}
                style={{
                  marginTop: 12, background: digestEmail !== profile.digestEmail ? '#e8b84b' : '#1a1a1a',
                  color: digestEmail !== profile.digestEmail ? '#0a0a0a' : '#444',
                  border: 'none', borderRadius: 8, padding: '10px 20px',
                  fontSize: 14, fontWeight: 500, cursor: digestEmail !== profile.digestEmail ? 'pointer' : 'default',
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s'
                }}
              >
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>

            {/* Delete */}
            <div style={{
              background: '#111111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '24px'
            }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Delete profile</div>
              <div style={{ fontSize: 13, color: '#666660', marginBottom: 16, lineHeight: 1.6 }}>
                Permanently stops all emails and removes your preferences.
              </div>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    background: 'none', border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: 8, color: '#f87171', padding: '10px 20px',
                    fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
                  }}
                >
                  Delete my profile
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => doAction('delete')}
                    style={{
                      background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                      borderRadius: 8, color: '#f87171', padding: '10px 20px',
                      fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
                    }}
                  >
                    Yes, delete everything
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{
                      background: '#1a1a1a', border: '1px solid #2a2a2a',
                      borderRadius: 8, color: '#888880', padding: '10px 20px',
                      fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </main>
  )
}

export default function Settings() {
  return (
    <Suspense fallback={<div style={{ color: '#555', padding: 40 }}>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
