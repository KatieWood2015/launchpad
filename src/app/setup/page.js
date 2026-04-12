'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const STEPS = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'preferences', label: 'Preferences', icon: '🎯' },
  { id: 'companies', label: 'Companies', icon: '🏢' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'delivery', label: 'Delivery', icon: '📬' },
]

const inputStyle = {
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: 6,
  color: '#f0ede8',
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
  fontFamily: 'DM Sans, sans-serif',
  transition: 'border-color 0.15s',
}

const labelStyle = {
  fontSize: 12,
  fontFamily: 'DM Mono, monospace',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#888880',
  marginBottom: 8,
  display: 'block',
}

const hintStyle = {
  fontSize: 12,
  color: '#555550',
  marginTop: 6,
  lineHeight: 1.5,
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <p style={hintStyle}>{hint}</p>}
    </div>
  )
}

function FileUpload({ onFile, accept, label, file }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handleFile = (f) => {
    if (f) onFile(f)
  }

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
      style={{
        border: `1px dashed ${dragging ? '#e8d5a3' : file ? '#4ade80' : '#333333'}`,
        borderRadius: 8,
        padding: '32px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s',
        background: dragging ? 'rgba(232,213,163,0.04)' : file ? 'rgba(74,222,128,0.04)' : '#111111',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />
      <div style={{ fontSize: 28, marginBottom: 10 }}>
        {file ? '✅' : '📁'}
      </div>
      {file ? (
        <>
          <div style={{ fontSize: 14, color: '#4ade80', fontWeight: 500 }}>{file.name}</div>
          <div style={{ fontSize: 12, color: '#555550', marginTop: 4 }}>Click to replace</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 14, color: '#888880' }}>{label}</div>
          <div style={{ fontSize: 12, color: '#555550', marginTop: 4 }}>or click to browse</div>
          <div style={{ fontSize: 11, color: '#444440', marginTop: 8, fontFamily: 'DM Mono, monospace' }}>
            {accept.replace(/,/g, ' · ')}
          </div>
        </>
      )}
    </div>
  )
}

export default function Setup() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [existingResumeName, setExistingResumeName] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    whyStatement: '',
    targetRoles: '',
    location: '',
    remotePreference: 'hybrid',
    minSalary: '',
    levelPreference: '',
    culturePriorities: '',
    industriesToAvoid: '',
    targetCompanies: '',
    coverLetterText: '',
    digestEmail: '',
  })
  const [resumeFile, setResumeFile] = useState(null)

  useEffect(() => {
    let cancelled = false
    const hydrateFromProfile = (profile) => {
      if (!profile || cancelled) return
      setForm(f => ({
        ...f,
        name: profile.name || '',
        email: profile.email || '',
        whyStatement: profile.whyStatement || '',
        targetRoles: profile.targetRoles || '',
        location: profile.location || '',
        remotePreference: profile.remotePreference || 'hybrid',
        minSalary: profile.minSalary || '',
        levelPreference: profile.levelPreference || '',
        culturePriorities: profile.culturePriorities || '',
        industriesToAvoid: profile.industriesToAvoid || '',
        targetCompanies: Array.isArray(profile.targetCompanies)
          ? profile.targetCompanies.join(', ')
          : (profile.targetCompanies || ''),
        coverLetterText: profile.coverLetterText || '',
        digestEmail: profile.digestEmail || profile.email || '',
      }))
      if (profile.resumeFileName) {
        setExistingResumeName(profile.resumeFileName)
      } else if (profile.resumePath) {
        setExistingResumeName(profile.resumePath.split(/[\\/]/).pop() || 'Existing resume')
      }
    }

    try {
      const stored = localStorage.getItem('launchpad_profile')
      if (stored) {
        hydrateFromProfile(JSON.parse(stored))
      }
    } catch {}

    return () => { cancelled = true }
  }, [])

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const isStepValid = () => {
    if (step === 0) return form.name && form.email && form.whyStatement
    if (step === 1) return form.targetRoles && form.location && form.minSalary
    if (step === 2) return form.targetCompanies
    if (step === 3) return (resumeFile || existingResumeName) && form.coverLetterText
    if (step === 4) return form.digestEmail
    return true
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([k, v]) => formData.append(k, v))
      if (resumeFile) formData.append('resume', resumeFile)

      const res = await fetch('/api/setup', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Setup failed')
      if (data.profile) {
        localStorage.setItem('launchpad_profile', JSON.stringify(data.profile))
      }
      router.push('/dashboard')
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const nextStep = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleSubmit()
  }

  const sections = [
    // Step 0: Profile
    <div key="profile">
      <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, marginBottom: 8 }}>
        Tell us about you
      </h2>
      <p style={{ color: '#888880', marginBottom: 36, fontSize: 14 }}>
        This shapes how Launchpad represents you to the world.
      </p>
      <Field label="Full name">
        <input style={inputStyle} value={form.name} onChange={e => update('name', e.target.value)}
          placeholder="Alex Johnson" />
      </Field>
      <Field label="Email address">
        <input style={inputStyle} type="email" value={form.email} onChange={e => update('email', e.target.value)}
          placeholder="alex@email.com" />
      </Field>
      <Field label="Your 'why'" hint="1–2 sentences you'd say at the start of an interview. This personalizes your outreach messages.">
        <textarea style={{ ...inputStyle, minHeight: 100 }} value={form.whyStatement}
          onChange={e => update('whyStatement', e.target.value)}
          placeholder="I love building products at the intersection of data and user experience — finding the insights that drive growth and turning them into systems that scale." />
      </Field>
    </div>,

    // Step 1: Job preferences
    <div key="prefs">
      <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, marginBottom: 8 }}>
        What are you looking for?
      </h2>
      <p style={{ color: '#888880', marginBottom: 36, fontSize: 14 }}>
        Launchpad uses this to filter and rank job matches every morning.
      </p>
      <Field label="Target role types" hint="Comma-separated. Be specific — these are used in job searches.">
        <textarea style={{ ...inputStyle, minHeight: 80 }} value={form.targetRoles}
          onChange={e => update('targetRoles', e.target.value)} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Location">
          <input style={inputStyle} value={form.location} onChange={e => update('location', e.target.value)}
            placeholder="New York, NY" />
        </Field>
        <Field label="Work style">
          <select style={inputStyle} value={form.remotePreference} onChange={e => update('remotePreference', e.target.value)}>
            <option value="remote">Remote only</option>
            <option value="hybrid">Hybrid (preferred)</option>
            <option value="onsite">Open to onsite</option>
            <option value="open">No preference</option>
          </select>
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Min. base salary ($)">
          <input style={inputStyle} type="number" value={form.minSalary}
            onChange={e => update('minSalary', e.target.value)} placeholder="120000" />
        </Field>
        <Field label="Level preference">
          <input style={inputStyle} value={form.levelPreference}
            onChange={e => update('levelPreference', e.target.value)} placeholder="Mid to senior" />
        </Field>
      </div>
      <Field label="Culture priorities" hint="What matters most in a workplace?">
        <input style={inputStyle} value={form.culturePriorities}
          onChange={e => update('culturePriorities', e.target.value)}
          placeholder="Work-life balance, maternity leave, mission-driven..." />
      </Field>
      <Field label="Industries to avoid">
        <input style={inputStyle} value={form.industriesToAvoid}
          onChange={e => update('industriesToAvoid', e.target.value)}
          placeholder="crypto, defense, tobacco" />
      </Field>
    </div>,

    // Step 2: Companies
    <div key="companies">
      <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, marginBottom: 8 }}>
        Your target companies
      </h2>
      <p style={{ color: '#888880', marginBottom: 36, fontSize: 14 }}>
        Launchpad will search these career pages daily and suggest similar companies based on your profile.
      </p>
      <Field label="Target companies" hint="Comma-separated. Launchpad will also suggest similar companies automatically.">
        <textarea style={{ ...inputStyle, minHeight: 120 }} value={form.targetCompanies}
          onChange={e => update('targetCompanies', e.target.value)}
          placeholder="Stripe, Figma, Notion, Linear, Vercel" />
      </Field>
      <div style={{
        background: '#111111', border: '1px solid #2a2a2a', borderRadius: 8,
        padding: '16px 20px', marginTop: 8
      }}>
        <div style={{ fontSize: 12, color: '#888880', marginBottom: 8, fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          💡 Tip
        </div>
        <p style={{ fontSize: 13, color: '#666660', lineHeight: 1.6 }}>
          Start with 5–10 companies you're genuinely excited about. Launchpad will suggest 2–3 similar ones each day, 
          which is a great way to discover companies you hadn't considered.
        </p>
      </div>
    </div>,

    // Step 3: Documents
    <div key="docs">
      <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, marginBottom: 8 }}>
        Your documents
      </h2>
      <p style={{ color: '#888880', marginBottom: 36, fontSize: 14 }}>
        Uploaded once, tailored daily. Launchpad never rewrites your bullets — only reorders and removes to fit one page.
      </p>
      <Field label="Resume" hint="PDF or .docx. Launchpad will preserve your exact wording.">
        <FileUpload
          accept=".pdf,.docx"
          label="Drag & drop your resume here"
          file={resumeFile || (existingResumeName ? { name: existingResumeName } : null)}
          onFile={(file) => {
            setResumeFile(file)
            if (file) setExistingResumeName('')
          }}
        />
      </Field>
      <Field label="Cover letter template" hint={'Use [COMPANY] where the company name should appear, and [ROLE] for the job title. Include multiple body paragraphs — Launchpad selects the best ones per job.'}>
        <textarea style={{ ...inputStyle, minHeight: 220 }} value={form.coverLetterText}
          onChange={e => update('coverLetterText', e.target.value)}
          placeholder={`Dear Hiring Team at [COMPANY],

I'm excited to apply for the [ROLE] position. [Opening paragraph about your enthusiasm...]

[Body paragraph 1 — e.g., your analytics background]

[Body paragraph 2 — e.g., your cross-functional experience]

[Body paragraph 3 — e.g., why this company specifically]

I'd love the opportunity to bring this experience to [COMPANY].

Sincerely,
${form.name || 'Your Name'}`} />
      </Field>
    </div>,

    // Step 4: Delivery
    <div key="delivery">
      <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, marginBottom: 8 }}>
        Where should we send your digest?
      </h2>
      <p style={{ color: '#888880', marginBottom: 36, fontSize: 14 }}>
        Launchpad emails you every weekday morning with matched jobs and tailored documents attached.
      </p>
      <Field label="Digest delivery email" hint="You'll receive your daily job matches here every weekday morning.">
        <input style={inputStyle} type="email" value={form.digestEmail}
          onChange={e => update('digestEmail', e.target.value)}
          placeholder={form.email || 'alex@email.com'} />
      </Field>
      <div style={{
        background: '#111111', border: '1px solid #2a2a2a', borderRadius: 8,
        padding: '20px 24px', marginTop: 8
      }}>
        <div style={{ fontSize: 12, color: '#888880', marginBottom: 10, fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          🔒 About credentials
        </div>
        <p style={{ fontSize: 13, color: '#666660', lineHeight: 1.7 }}>
          API keys and email credentials are configured securely as environment variables on the server —
          not entered here. If you're self-hosting, see the README for setup instructions.
        </p>
      </div>
      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 6, padding: '12px 16px', color: '#f87171', fontSize: 13, marginTop: 16
        }}>
          {error}
        </div>
      )}
    </div>
  ]

  const progressPct = ((step) / (STEPS.length - 1)) * 100

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid #1a1a1a', padding: '16px 40px',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18 }}>🚀 Launchpad</span>
        <span style={{ color: '#333', fontSize: 14 }}>/</span>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#888880' }}>setup</span>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 48, alignItems: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                onClick={() => i < step && setStep(i)}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: i === step ? '#e8d5a3' : i < step ? '#1a2a1a' : '#1a1a1a',
                  border: `1px solid ${i === step ? '#e8d5a3' : i < step ? '#4ade80' : '#2a2a2a'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: i < step ? 14 : 13,
                  cursor: i < step ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  color: i === step ? '#0a0a0a' : i < step ? '#4ade80' : '#555550',
                  fontWeight: i === step ? 600 : 400,
                  flexShrink: 0,
                }}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  height: 1, width: 24,
                  background: i < step ? '#4ade80' : '#2a2a2a',
                  transition: 'background 0.3s'
                }} />
              )}
            </div>
          ))}
          <span style={{
            fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555550',
            marginLeft: 12, letterSpacing: '0.04em'
          }}>
            {STEPS[step].label}
          </span>
        </div>

        {/* Form content */}
        <div key={step} style={{ animation: 'fadeUp 0.35s ease forwards' }}>
          {sections[step]}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 }}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            style={{
              background: 'none', border: '1px solid #2a2a2a', borderRadius: 100,
              color: step === 0 ? '#333' : '#888880', padding: '10px 20px',
              fontSize: 14, cursor: step === 0 ? 'default' : 'pointer', transition: 'all 0.15s',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            ← Back
          </button>

          <button
            onClick={nextStep}
            disabled={!isStepValid() || saving}
            style={{
              background: isStepValid() && !saving ? '#e8d5a3' : '#1a1a1a',
              color: isStepValid() && !saving ? '#0a0a0a' : '#444',
              border: 'none', borderRadius: 100, padding: '10px 28px',
              fontSize: 14, fontWeight: 600, cursor: isStepValid() && !saving ? 'pointer' : 'default',
              transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            {saving ? (
              <>
                <div style={{
                  width: 14, height: 14, border: '2px solid #444',
                  borderTopColor: '#888', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                Saving...
              </>
            ) : step === STEPS.length - 1 ? '🚀 Launch →' : 'Continue →'}
          </button>
        </div>
      </div>
    </main>
  )
}
