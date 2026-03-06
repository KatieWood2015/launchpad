'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const steps = [
  { icon: '⚙️', label: 'Set up your profile once' },
  { icon: '🔍', label: 'Launchpad searches your target companies' },
  { icon: '📄', label: 'Resume tailored to each job description' },
  { icon: '✉️', label: 'Cover letter customized per company' },
  { icon: '👥', label: '2 LinkedIn contacts + drafted outreach' },
  { icon: '📬', label: 'Everything emailed before you wake up' },
]

export default function Home() {
  const [visible, setVisible] = useState(false)
  const [time, setTime] = useState('')

  useEffect(() => {
    setVisible(true)
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid var(--border)',
        opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 28, height: 28, background: 'var(--accent)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14
          }}>🚀</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text)' }}>Launchpad</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--green)',
            animation: 'pulse 2s infinite'
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
            {time} · running daily
          </span>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 40px 60px', textAlign: 'center',
        maxWidth: 760, margin: '0 auto', width: '100%'
      }}>
        <div style={{
          opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)',
          transition: 'all 0.7s ease 0.1s'
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-3)', border: '1px solid var(--border)',
            borderRadius: 100, padding: '6px 14px', marginBottom: 40,
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)',
            letterSpacing: '0.08em', textTransform: 'uppercase'
          }}>
            <span style={{ color: 'var(--green)' }}>●</span> Powered by Claude AI
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(42px, 7vw, 80px)',
            lineHeight: 1.05,
            letterSpacing: '-1px',
            color: 'var(--text)',
            marginBottom: 28
          }}>
            Find the right roles.<br />
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Show up prepared.</em>
          </h1>

          <p style={{
            fontSize: 17, color: 'var(--text-muted)', lineHeight: 1.7,
            maxWidth: 520, margin: '0 auto 48px'
          }}>
            Launchpad researches your target companies every morning, identifies the best-fit roles, 
            and prepares tailored materials — so you can focus on the conversations that matter.
          </p>

          <Link href="/setup">
            <button style={{
              background: 'var(--accent)', color: '#0a0a0a',
              border: 'none', borderRadius: 100, padding: '14px 36px',
              fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)',
              cursor: 'pointer', transition: 'all 0.2s',
              letterSpacing: '0.01em'
            }}
              onMouseEnter={e => {
                e.target.style.background = '#f0e0b0'
                e.target.style.transform = 'translateY(-1px)'
                e.target.style.boxShadow = '0 8px 24px rgba(232,213,163,0.25)'
              }}
              onMouseLeave={e => {
                e.target.style.background = 'var(--accent)'
                e.target.style.transform = 'none'
                e.target.style.boxShadow = 'none'
              }}
            >
              Set up Launchpad →
            </button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section style={{
        borderTop: '1px solid var(--border)',
        padding: '80px 40px 100px',
        maxWidth: 860, margin: '0 auto', width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--green)', marginBottom: 14
          }}>How it works</p>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 42px)',
            color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1.1
          }}>Six steps. Zero mornings wasted.</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 24,
              padding: '22px 28px',
              background: i % 2 === 0 ? 'var(--bg-2)' : 'var(--bg)',
              borderRadius: 10,
              border: '1px solid var(--border)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateX(-12px)',
              transition: `all 0.5s ease ${0.08 + i * 0.08}s`,
            }}>
              {/* Step number */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: i === steps.length - 1 ? 'rgba(74,222,128,0.12)' : 'var(--bg-3)',
                border: `1px solid ${i === steps.length - 1 ? 'rgba(74,222,128,0.3)' : 'var(--border-light)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: i === steps.length - 1 ? 'var(--green)' : 'var(--text-dim)',
              }}>
                {String(i + 1).padStart(2, '0')}
              </div>

              {/* Icon */}
              <div style={{
                fontSize: 20, width: 32, textAlign: 'center', flexShrink: 0
              }}>{step.icon}</div>

              {/* Label */}
              <div style={{
                fontSize: 15, color: i === steps.length - 1 ? 'var(--green)' : 'var(--text)',
                fontWeight: i === steps.length - 1 ? 500 : 400,
                flex: 1, lineHeight: 1.4
              }}>{step.label}</div>

              {/* Connector arrow — all but last */}
              {i < steps.length - 1 && (
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--text-dim)', flexShrink: 0
                }}>↓</div>
              )}
              {i === steps.length - 1 && (
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--green)', flexShrink: 0, letterSpacing: '0.04em'
                }}>✓ done</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '24px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
          Built with Claude · ~$0.10/day to run
        </span>
        <Link href="/setup">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', cursor: 'pointer' }}>
            Get started →
          </span>
        </Link>
      </footer>
    </main>
  )
}
