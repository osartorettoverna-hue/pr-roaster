# 🔥 PR Roaster

**Paste your PR. Get destroyed.**

A brutally honest, AI-powered code review tool that roasts your pull requests like a toxic-but-brilliant senior engineer.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/pr-roaster&env=ANTHROPIC_API_KEY&envDescription=Get%20your%20key%20at%20console.anthropic.com)

---

## What it does

Paste a GitHub PR diff (or just describe your code changes) into the textarea. The app streams back a savage, sarcastic code review powered by Claude — complete with a severity badge, flame annotations, and zero mercy.

## Stack

- **Next.js 15** (App Router)
- **Tailwind CSS**
- **Anthropic SDK** with streaming (`claude-sonnet-4-20250514`)
- No database, no auth, no nonsense

## Getting started locally

1. **Clone the repo**

   ```bash
   git clone https://github.com/YOUR_USERNAME/pr-roaster
   cd pr-roaster
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Add your Anthropic API key**

   ```bash
   cp .env.example .env.local
   # then edit .env.local and set ANTHROPIC_API_KEY
   ```

   Get your key at [console.anthropic.com](https://console.anthropic.com/).

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

Click the button above, or:

```bash
npx vercel
```

When prompted, add the environment variable:

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

> Made with Claude API · No PRs were harmed
