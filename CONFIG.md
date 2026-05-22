LIMS Web — Configuration Guide

Purpose
- Document env files, Vite runtime env usage, and standard scripts.

Env files
- `.env.example` — template (committed)
- `.env` — local defaults (can be used directly by Vite)
- `.env.local` — developer overrides (gitignored)
- `.env.development` / `.env.production` — mode-specific files

Precedence (highest → lowest)
1. Process environment variables
2. `.env.local`
3. `.env.development` / `.env.production`
4. `.env`

Key environment vars used
- `VITE_API_URL` — backend API base URL used in `src/api/client.ts` and `vite.config.ts`
- `VITE_GOOGLE_CLIENT_ID` — optional Google OAuth client ID used by auth flows

Standard scripts (in `package.json`)
- `npm run dev` — development hot-reload
- `npm run build` — build production bundle
- `npm run start` — preview built bundle
- `npm run prod` — build + preview in binding `prod` mode

Notes
- Vite exposes env variables via `import.meta.env`.
- Keep secrets out of committed env files.
- Use `npm run dev` during development and `npm run prod` for production-like local testing.
