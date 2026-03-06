'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const [visible, setVisible] = useState(false)
  const [runStatus, setRunStatus] = useState(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    setVisible(true)
  }, [])

  const triggerRun = async () => {
    setRunning(true)
    setRunStatus(null)
    try {
      const res = await fetch('/api/run-daily', { method: 'POST' })
      const data = await res.json()
      setRunStatus(data.ok ? 'success' : 'error')
    } catch {
      setRunStatus('error')
    }
    setRunning(false)
  }

  const card = (icon, title, body, delay = 0) => (
    <div style={{
      background: '#111111', border: '1px solid #1e1e1e', borderRadius: 10,
      padding: '24px', opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(12px)',
      transition: `all 0.5s ease ${delay}s`
    }}>
      <div style={{ fontSize: 22, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#f0ede8', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#666660', lineHeight: 1.6 }}>{body}</div>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh' }}>
      {/* Nav */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18 }}>🚀 Launchpad</span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/settings">
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#888880', cursor: 'pointer' }}>
              Settings
            </span>
          </Link>
          <Link href="/setup">
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#888880', cursor: 'pointer' }}>
              Edit profile →
            </span>
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px' }}>

        {/* Success state */}
        <div style={{
          textAlign: 'center', marginBottom: 64,
          opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease 0.1s'
        }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🚀</div>
          <h1 style={{
            fontFamily: 'DM Serif Display, serif', fontSize: 36,
            marginBottom: 12, letterSpacing: '-0.5px'
          }}>
            You're all set.
          </h1>
          <p style={{ color: '#888880', fontSize: 15, maxWidth: 440, margin: '0 auto 32px', lineHeight: 1.7 }}>
            Launchpad will search your target companies every weekday morning and email you 
            matched jobs with tailored documents before you wake up.
          </p>

          <button
            onClick={triggerRun}
            disabled={running}
            style={{
              background: running ? '#1a1a1a' : '#e8d5a3', color: running ? '#444' : '#0a0a0a',
              border: 'none', borderRadius: 100, padding: '12px 28px',
              fontSize: 14, fontWeight: 600, cursor: running ? 'default' : 'pointer',
              transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {running ? (
              <>
                <div style={{
                  width: 14, height: 14, border: '2px solid #444',
                  borderTopColor: '#888', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                Running...
              </>
            ) : '▶ Run now (test)'}
          </button>

          {runStatus === 'success' && (
            <div style={{
              background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
              borderRadius: 8, padding: '12px 20px', color: '#4ade80', fontSize: 13,
              maxWidth: 360, margin: '16px auto 0'
            }}>
              ✅ Done! Check your inbox for the digest.
            </div>
          )}
          {runStatus === 'error' && (
            <div style={{
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 8, padding: '12px 20px', color: '#f87171', fontSize: 13,
              maxWidth: 360, margin: '16px auto 0'
            }}>
              Something went wrong. Check your API keys in setup.
            </div>
          )}
        </div>

        {/* Next steps */}
        <div style={{ marginBottom: 32 }}>
          <p style={{
            fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: '#555550', marginBottom: 20
          }}>Next steps</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {card('⚙️', 'Automate with GitHub Actions', 'Deploy to GitHub and set up the daily workflow. Free, runs in the cloud — no computer needed.', 0.15)}
            {card('📬', 'Check your inbox', 'After your first run, you\'ll get an email with 2 tailored job matches, resumes, cover letters, and outreach drafts.', 0.2)}
            {card('🏢', 'Add more companies', 'Update your target company list anytime. Launchpad also suggests similar companies each day.', 0.25)}
            {card('✏️', 'Refine your cover letter', 'The more paragraphs you include, the better Launchpad can match them to each specific role.', 0.3)}
          </div>
        </div>

        {/* GitHub Actions setup */}
        <div style={{
          background: '#0d1117', border: '1px solid #2a2a2a', borderRadius: 10,
          padding: '24px', opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease 0.35s'
        }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#888880', marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            🤖 Automate with GitHub Actions
          </div>
          <p style={{ fontSize: 13, color: '#666660', lineHeight: 1.7, marginBottom: 20 }}>
            To run Launchpad automatically every weekday morning, push this repo to GitHub 
            and add your profile as a secret. The workflow runs at 7am PT — free, no server needed.
          </p>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#c9d1d9', lineHeight: 2 }}>
            <div><span style={{ color: '#555' }}># 1. Push to GitHub</span></div>
            <div><span style={{ color: '#79c0ff' }}>git</span> init && git add . && git commit -m <span style={{ color: '#a5d6ff' }}>"init"</span></div>
            <div><span style={{ color: '#79c0ff' }}>git</span> remote add origin https://github.com/you/launchpad.git</div>
            <div><span style={{ color: '#79c0ff' }}>git</span> push -u origin main</div>
            <div style={{ marginTop: 8 }}><span style={{ color: '#555' }}># 2. Add secret: Settings → Secrets → LAUNCHPAD_PROFILE</span></div>
            <div><span style={{ color: '#555' }}>#    Value: contents of config/profile.json</span></div>
          </div>
        </div>
      </div>
    </main>
  )
}
