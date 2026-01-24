# Deployment Guide

## Architecture
- **Frontend**: Vite + PixiJS → Deploy to Vercel
- **Backend**: Express + Socket.IO → Deploy to Railway
- **Auth & Database**: Supabase (optional)

---

## Step 0: Setup Supabase (Optional - for Google Login)

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and name your project

### 2. Run Database Schema
1. Go to **SQL Editor** in Supabase dashboard
2. Copy contents of `supabase/schema.sql`
3. Run the query

### 3. Enable Google OAuth
1. Go to **Authentication** → **Providers**
2. Click **Google**
3. Enable it
4. You'll need Google Cloud credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
5. Copy Client ID and Secret to Supabase

### 4. Get API Keys
1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

---

## Step 1: Deploy Server to Railway

### Option A: Via GitHub
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Railway will auto-detect the config from `railway.json`

### Option B: Via CLI
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Get your server URL
After deployment, Railway provides a URL like:
`https://ruins-nexus-production.up.railway.app`

---

## Step 2: Deploy Frontend to Vercel

### Option A: Via GitHub
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. **Important**: Add environment variable:
   - Name: `VITE_SERVER_URL`
   - Value: `https://your-railway-server.up.railway.app`
5. Deploy!

### Option B: Via CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## Environment Variables

### Vercel (Frontend)
| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_SERVER_URL` | `https://your-railway-url.railway.app` | WebSocket server URL |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase project URL (optional) |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase anon key (optional) |

### Railway (Backend)
| Variable | Value | Description |
|----------|-------|-------------|
| `PORT` | Auto-set by Railway | Server port |

---

## Local Development

```bash
# Start both server and client
npm run dev:all

# Or separately:
npm run server  # Backend on :3001
npm run dev     # Frontend on :5173
```

---

## Debug Panel

Press 🐛 button (top-left) in game to access:
- **+10 Resources**: Add 10 of each resource
- **Full Heal**: Restore HP to 5
- **Skip Turn**: End current turn
- **Reset Game**: Return all players to lobby
- **Leave Game**: Disconnect and return to lobby

---

## Troubleshooting

### "Connection refused" on production
- Check `VITE_SERVER_URL` is set correctly in Vercel
- Verify Railway server is running (`/health` endpoint)

### State desync
- Refresh the page - it will automatically reconnect
- Use Debug Panel → Reset Game if needed
