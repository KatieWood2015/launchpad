# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
Launchpad is a Next.js 14 AI job search assistant. See `README.md` for full details.

### Running the app
- `npm run dev` starts the Next.js dev server on port 3000 (no database or external services required for the web UI)
- `npm run build` builds for production
- There is no ESLint or linter configured in this project

### File storage
The app uses file-based storage (`config/profile.json`, `config/resume.*`). On Vercel, the filesystem is read-only except `/tmp`, so `src/lib/paths.js` resolves storage directories to `/tmp` when the `VERCEL` env var is set. Locally, it writes to `config/` in the project root.

### Environment variables
Required for full AI pipeline functionality (not needed for basic web UI testing):
- `ANTHROPIC_API_KEY` — Claude API access
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` — email delivery

### Key caveats
- After killing the dev server, `next-server` child processes may linger on the port. Use `netstat -tlnp | grep 300` to find them and kill by PID before restarting.
- The `config/` and `output/` directories are gitignored and created at runtime.
