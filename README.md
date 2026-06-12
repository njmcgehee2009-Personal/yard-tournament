# McGehee Yard Tournament

A mobile web app for organizing backyard lawn game tournaments — with Round Robin, Single Elimination, and Double Elimination bracket support for up to 5 yard games.

---

## Setup (one-time, ~10 minutes)

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account + new project.
2. Open the **SQL Editor** and paste the entire contents of `schema.sql`, then click **Run**.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → your `VITE_SUPABASE_URL`
   - **anon / public** key → your `VITE_SUPABASE_ANON_KEY`

### 2. Create an organizer account

In Supabase: **Authentication → Users → Invite user** — enter your email. You'll get a confirmation email; set your password there.

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in your Supabase URL and anon key
```

### 4. Install & run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/yard-tournament/ (or whatever port Vite assigns).

---

## Deploy to GitHub Pages

1. Create a GitHub repo (e.g. `yard-tournament`).
2. In `vite.config.js`, change `base: '/yard-tournament/'` to match your repo name.
3. Add your Supabase secrets to the repo:  
   **Settings → Secrets and variables → Actions** → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Push your code:
   ```bash
   git init && git add . && git commit -m "initial commit"
   git remote add origin https://github.com/YOUR_USER/yard-tournament.git
   git push -u origin main
   ```
5. Deploy:
   ```bash
   npm run deploy
   ```
   This builds the app and pushes to the `gh-pages` branch.
6. In GitHub repo settings → **Pages** → set source to `gh-pages` branch.

Your app will be live at `https://YOUR_USER.github.io/yard-tournament/`

---

## How to run a tournament

### As organizer (logged in)
1. Go to **Admin → New Tournament** — add name, date, location.
2. **Teams tab** — add all participating teams (name + color).
3. **Games tab** — add up to 5 yard games, pick format (Round Robin / Single Elim / Double Elim), select which teams play, then **Generate bracket**.
4. **Matches tab** — tap any pending match to enter scores. Winners advance automatically.

### As a viewer (public, no login)
- Visit the app, tap a tournament, then browse game tabs.
- Use the **Bracket** tab to follow match progression.
- Use the **Standings** tab for live rankings.
- Standings update in real time as scores are entered.

---

## Supported Yard Games

Cornhole · Bocce Ball · Kan Jam · Spikeball · Ladder Toss · Horseshoes · Bags · Croquet

(Custom game names work too — you can type any name.)

## Tournament Formats

| Format | Best for |
|---|---|
| **Round Robin** | Everyone plays everyone. Points-based standings. |
| **Single Elimination** | Fast, high-stakes. One loss = out. |
| **Double Elimination** | Balanced. Two losses to be eliminated. |
