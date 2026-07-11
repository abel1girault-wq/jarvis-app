# Aura — AI Chat + Study Assistant

Chat with Claude, Gemini, GPT-4, and Groq. Study smarter with Google Classroom. Never miss a calendar event.

## Features

- **Streaming chat** — text appears live like Claude.ai
- **Multiple AI models** — switch between Claude, Gemini, GPT-4, Groq mid-conversation
- **Image generation** — `/image a sunset over the ocean` (needs OpenAI or Google key)
- **Study tools** — Tutor, Quiz, Flashcards, Study planner, Essay help
- **Google Classroom** — see your courses, assignments, and due dates
- **Google Calendar** — "what do I have at 7pm?" works automatically in chat
- **Saved conversations** — everything is saved with full history
- **Admin approval** — you control who gets access

## Quick Setup

```bash
git clone / unzip into a folder
cd aura
node setup.js        # interactive wizard — creates your .env
npm install
npm run db:push      # creates database tables
npm run dev
```

Open http://localhost:3000, register with your admin email, and you're in.

## Getting API Keys

| Provider | URL | Cost |
|----------|-----|------|
| Google Gemini | aistudio.google.com | **Free** |
| Groq | console.groq.com | **Free** |
| Anthropic (Claude) | console.anthropic.com | Paid ($5 minimum) |
| OpenAI (GPT + images) | platform.openai.com | Paid |

Start with Gemini and Groq — both are completely free with no credit card.

## Google Calendar + Classroom Setup

This takes about 10 minutes and is optional (the rest of the app works without it).

1. Go to **console.cloud.google.com**
2. Create a new project (e.g. "Aura")
3. Go to **APIs & Services → Enable APIs**
4. Enable: **Google Calendar API** and **Google Classroom API**
5. Go to **APIs & Services → OAuth consent screen**
   - User type: External
   - Fill in app name, your email
   - Add scopes: Calendar (read-only) and Classroom (read-only)
   - Add your email as a test user
6. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/google/callback`
   - For Vercel: also add `https://your-app.vercel.app/api/google/callback`
7. Copy the **Client ID** and **Client Secret**
8. Add to your `.env`:
   ```
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   NEXT_PUBLIC_URL="http://localhost:3000"
   ```
9. Restart `npm run dev`
10. Go to Settings → Google → Connect Google

## Deploying to Vercel (free, always online)

1. Push to GitHub
2. Import at vercel.com
3. Add all env variables from your `.env` in Vercel project settings
4. Change `NEXT_PUBLIC_URL` to your Vercel URL
5. Deploy
6. Update the Google OAuth redirect URI to your Vercel URL

## Environment Variables

```env
DATABASE_URL=""          # PostgreSQL (free at neon.tech)
JWT_SECRET=""            # openssl rand -base64 32
ENCRYPTION_KEY=""        # openssl rand -hex 32 (must be 64 chars)
ADMIN_EMAIL=""           # auto-approved admin on register
NEXT_PUBLIC_URL=""       # http://localhost:3000 or your Vercel URL

# AI Keys (add the ones you have)
ANTHROPIC_KEY=""
GOOGLE_AI_KEY=""
OPENAI_KEY=""
GROQ_KEY=""

# Google OAuth (optional — for Calendar + Classroom)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```
