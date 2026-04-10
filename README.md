# 🚀 Launchpad

**Your personal AI job search assistant.**

Wake up every morning to tailored job matches, a customized resume, a personalized cover letter, and drafted LinkedIn outreach — all delivered to your inbox before your alarm goes off.

**[Live demo →](https://launchpad.vercel.app)** *(deploy your own in 10 minutes)*

---

## What it does

Every weekday morning, Launchpad:

1. **Searches your target company career pages** for open roles that match your profile
2. **Suggests similar companies** based on your preferences
3. **Tailors your resume** — reorders and removes bullets to fit one page; never rewrites your words
4. **Customizes your cover letter** — selects the best-fitting paragraphs and fills in the company name
5. **Finds 2 LinkedIn contacts** — a recruiter and a hiring manager or peer — with drafted outreach messages
6. **Emails everything to you** — matched jobs, attached .docx files, and copy-paste LinkedIn messages

---

## Tech stack

- **Next.js 14** — web UI + API routes
- **Claude API (Anthropic)** — job matching, resume tailoring, outreach drafting
- **Web Search tool** — real-time job and contact research
- **docx** — generates formatted Word documents
- **nodemailer** — sends the daily digest email
- **GitHub Actions** — free daily automation (no server needed)
- **Vercel** — free hosting for the web UI

---

## Setup (10–20 minutes)

### 1. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/launchpad)

Or manually:
```bash
git clone https://github.com/yourusername/launchpad.git
cd launchpad
npm install
npm run dev  # localhost:3000
```

### 2. Add environment variables

In Vercel: go to your project → **Settings** → **Environment Variables** and add:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | From [console.anthropic.com](https://console.anthropic.com) |
| `GMAIL_USER` | The Gmail address Launchpad sends from |
| `GMAIL_APP_PASSWORD` | From [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (requires 2FA) |

For local development, create a `.env.local` file in the project root:
```
ANTHROPIC_API_KEY=sk-ant-...
GMAIL_USER=yourname@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

### 3. Complete onboarding

Visit your deployed app and complete the 5-step setup:
- Profile info and your "why" statement
- Job preferences (roles, location, salary)
- Target companies
- Resume upload (.pdf or .docx) + cover letter template
- Digest delivery email

### 4. Automate with GitHub Actions

1. Push to a **private** GitHub repo
2. Go to Settings → Secrets → Actions → New secret
3. Name: `DATABASE_URL` / Value: your app database connection string
4. Enable Actions → it runs at 7am PT every weekday

Legacy fallback (optional): if `DATABASE_URL` is not set, workflow will fall back to `LAUNCHPAD_PROFILE`.

To run immediately: Actions tab → Launchpad Daily Digest → Run workflow

---

## Required environment variables

| Variable | Where to get it | Cost |
|----------|----------------|------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | ~$0.10/day |
| `GMAIL_USER` | Your Gmail address | Free |
| `GMAIL_APP_PASSWORD` | [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) | Free |

These are set as environment variables in Vercel — never entered by users in the UI.

---

## Cover letter format

In your cover letter template, use these placeholders:
- `[COMPANY]` — replaced with the company name
- `[ROLE]` — replaced with the job title

Include multiple body paragraphs covering different angles (e.g., your analytics background, cross-functional experience, why this company). Launchpad selects the best-fitting ones per job.

---

## Project structure

```
launchpad/
├── src/
│   ├── app/
│   │   ├── page.js              # Landing page
│   │   ├── setup/page.js        # 5-step onboarding UI
│   │   ├── dashboard/page.js    # Post-setup dashboard
│   │   └── api/
│   │       ├── setup/route.js   # Saves profile + parses resume
│   │       └── run-daily/route.js  # Manual trigger endpoint
│   └── lib/
│       ├── daily.js             # GitHub Actions runner
│       ├── jobSearch.js         # Searches career pages
│       ├── resumeTailor.js      # Tailors resume → .docx
│       └── pipeline.js          # Cover letter, outreach, email
├── .github/workflows/daily.yml  # Automated daily run
├── vercel.json                  # Vercel deployment config
└── README.md
```

---

## Customization

**Change the run time:** Edit `cron: '0 15 * * 1-5'` in `.github/workflows/daily.yml`
- `0 15` = 7am PT | `0 16` = 8am PT | `0 12` = 7am ET

**Change the model:** Edit `claude-sonnet-4-20250514` in the lib files (Haiku is cheaper; Opus is more powerful)

**Add more companies:** Re-run setup in the app (stored in DB) or edit `config/profile.json` for local fallback mode

---

Built with ❤️ using the Anthropic Claude API.
