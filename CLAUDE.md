# CLAUDE.md — Rork AI Mobile App Builder

## Goal

Build and ship a **Rork-like AI Mobile App Builder** — a web tool where users describe a mobile app in natural language, an AI agent autonomously builds complete Expo/React Native code, and users can preview, edit, export, sync to GitHub, and build for app stores. Deployed on **Vercel** connected to **Supabase**.

---

## Instructions

- **Repo**: `https://github.com/ungden/rork-ai-builder.git` — cloned at `/Users/alexle/Documents/mobileai/rork-ai-builder`
- **Never rewrite from scratch** — always read existing code first, identify gaps, fix precisely
- **Always read files before editing**
- **Stack**: Next.js 16 (Turbopack), Tailwind v3 (downgraded from v4), Supabase SSR, `@ai-engine/core` workspace package, pnpm + Turborepo monorepo
- **AI providers**: Gemini (`GEMINI_API_KEY`) is the default model; Claude (`ANTHROPIC_API_KEY`) optional for full 11-tool `RorkAgent` loop
- **Deployment**: Vercel (connected to `ungden/rork-ai-builder` GitHub repo), Supabase project ID `wpfufmolfgcjnkxjgpqt`
- **Design direction**: Dark theme, clean/minimal like rork.com — centered text, proper spacing, Inter font
- **Do NOT commit `.env.local`** — credentials go in Vercel dashboard env vars only
- **`vercel.json`** configured with `buildCommand: "pnpm build:web"`, `outputDirectory: "apps/web/.next"`, `maxDuration: 300` for agent routes
- **Supabase env vars on Vercel**: `NEXT_PUBLIC_SUPABASE_URL` = `https://wpfufmolfgcjnkxjgpqt.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY` — all confirmed set
- **Supabase schema**: Deployed to live project (user confirmed)
- **Signup**: Only email + password (Name field removed)
- **Next.js 16 uses `proxy.ts`** not `middleware.ts` — file is `src/proxy.ts` with `export async function proxy`

---

## Key Architecture

### How the Landing → Editor Flow Works
1. `HeroPromptBox` (landing page) saves prompt to `sessionStorage('rork_pending_prompt')`
2. If logged in: creates project via `/api/projects` → redirects to `/editor/{id}`
3. If not logged in: redirects to `/signup`, after auth → dashboard → `PendingPromptHandler` auto-creates project → redirects to editor
4. Editor picks up prompt from sessionStorage → passes as `initialPrompt` to `ChatPanel`
5. ChatPanel auto-sends prompt to AI agent after 800ms delay (via `useRef` pattern, NOT `useCallback`)

### Preview Panel
- Uses Expo Snack SDK to render a phone-sized web preview
- Loads web player from S3 (`snack-web-player.s3.us-west-1.amazonaws.com`)
- Has CONNECT message replay logic to handle race conditions with iframe loading
- `isGenerating` is wired to `agentStore.isRunning` (not projectStore)
- Files apply immediately via `addGeneratingFile()` as each SSE event arrives — real-time preview updates

### AI Agent Pipeline
- **Gemini path**: `GeminiProvider.streamCode()` — uses `write_file` tool declaration, multi-turn tool loop (up to 20 rounds), yields file events via SSE
- **Claude path**: `RorkAgent` with 11 tools (create_plan, write_file, patch_file, search_files, verify_project, delete_file, read_file, list_files, run_test, fix_error, complete)
- System prompt is assembled from 5 modules in `packages/ai-engine/src/prompts/`: `expo-sdk54.ts`, `navigation.ts`, `styling.ts`, `components.ts`, `expo-knowledge.ts`
- All prompts target Expo Snack SDK 54 — formSheet/expo-symbols/SymbolView are BANNED (don't re-add them)

### State Management
- `projectStore` (Zustand + Immer): files, messages, activeFile, isGenerating, selectedModel
- `agentStore` (Zustand + Immer): isRunning, phase, plan, files, progress, processEvent

---

## Discoveries / Gotchas

### Tailwind v4 → v3 downgrade
- Tailwind v4's `@theme {}` hex tokens don't support opacity modifiers and its CSS layer ordering broke basic utilities on Vercel
- Downgraded to Tailwind v3 with `tailwind.config.ts`, standard postcss plugin, and `@tailwind` directives

### Supabase URL was wrong on Vercel
- Originally pointed to `ekeicbetveuvazfgmfii.supabase.co` (wrong) — corrected to `wpfufmolfgcjnkxjgpqt.supabase.co`

### Auto-send bug (FIXED in d749dea)
- `handleAgentRun` was wrapped in `useCallback` with `[files]` in deps → stale closure → prompt never sent
- **Fix**: Replaced with `useRef` pattern. `handleAgentRunRef.current` always points to latest function

### Preview `isGenerating` was never true (FIXED)
- PreviewPanel read `projectStore.isGenerating` but ChatPanel never called `setGenerating()`
- **Fix**: Wired to `agentStore.isRunning` instead — building overlay now shows correctly

### Prompt contradictions (FIXED)
- `expo-sdk54.ts` listed `expo-symbols`/`formSheet` as available but system prompt banned them
- `expo-knowledge.ts` showed `formSheet` with detents code example
- Styling/navigation/components files said "SDK 52" instead of "SDK 54"
- **Fix**: Removed contradictions, fixed version refs, added missing patterns (ActivityIndicator, Alert, StatusBar, LinearGradient, RefreshControl, +not-found.tsx, ImagePicker, Context state management), added Snack package allowlist, deduplicated repeated content

---

## Accomplished (All Completed)

- Tailwind v4 → v3 downgrade (CSS works on Vercel)
- All backend API routes working (agent, projects, files, settings, GitHub sync, EAS build, demo generate, auth)
- Supabase client/server setup with proxy.ts middleware
- AI agent pipeline (Claude + Gemini) with tool loop
- All editor components (ChatPanel, CodePanel, PreviewPanel, FileTree, Toolbar, QRPanel, CommandPalette, AgentStatus)
- Dashboard components (ProjectCard, CreateProjectButton, PendingPromptHandler)
- Auth flow (login, signup email+password, OAuth Google/GitHub, callback, signout)
- Interactive landing page prompt box (HeroPromptBox) with step-by-step progress
- Lovable-style build progress UX (PendingPromptHandler shows animated steps)
- Auto-save, keyboard shortcuts, command palette
- Export ZIP, GitHub sync, EAS build config generation
- Demo mode with pre-seeded files
- Supabase schema deployed to live project
- Signup simplified (name field removed)
- Auto-send bug fixed (useRef pattern)
- Preview "No app yet" empty state (instead of infinite spinner)
- Preview building overlay wired to agentStore.isRunning
- Real-time file application during agent SSE streaming
- Agent prompt quality: contradictions removed, missing patterns added, Snack allowlist added
- Error visibility improved (actual error message shown in chat)
- Unused imports cleaned up across all components
- Build passes: 0 errors, 0 TS errors, all 19 routes compile

## Current State

- **Live site works end-to-end**: Landing prompt → signup → project created → editor → AI agent builds app → preview shows result
- **Default model**: Gemini 2.0 Flash (no Anthropic key needed)
- **Latest tested commit**: auto-send fix confirmed working on production

## Remaining Work (Not Started)

- Error recovery UX — retry button in chat when agent fails
- Template packs — populate "Coming soon" dashboard section with starter templates (Todo, Weather, Chat app)
- Configure OAuth providers (Google/GitHub) in Supabase dashboard (user action)
- Add `ANTHROPIC_API_KEY` to Vercel for Claude model support (user action)
- Improve preview UX further — show "No app yet" → "Building..." → "Live" transition more smoothly
- Add conversation persistence — reload editor should restore chat history from DB

---

## Key Files

### Config / Infrastructure
- `vercel.json` — Vercel monorepo build config
- `apps/web/tailwind.config.ts` — Tailwind v3 config with custom colors, fonts, animations
- `apps/web/src/proxy.ts` — Next.js 16 proxy (middleware) for auth
- `supabase/schema.sql` — full Postgres schema

### Pages
- `apps/web/src/app/page.tsx` — landing page
- `apps/web/src/app/(auth)/login/page.tsx` / `signup/page.tsx` — auth
- `apps/web/src/app/dashboard/page.tsx` — projects list + PendingPromptHandler
- `apps/web/src/app/editor/[projectId]/page.tsx` — main editor

### Core Components
- `apps/web/src/components/editor/ChatPanel.tsx` — chat + agent SSE streaming + auto-send
- `apps/web/src/components/editor/PreviewPanel.tsx` — Snack SDK Expo preview
- `apps/web/src/components/landing/HeroPromptBox.tsx` — landing prompt box
- `apps/web/src/components/dashboard/PendingPromptHandler.tsx` — auto-creates project from saved prompt

### Stores
- `apps/web/src/stores/projectStore.ts` — project state (files, messages, selectedModel='gemini')
- `apps/web/src/stores/agentStore.ts` — agent state (phase, plan, files, progress)

### API Routes
- `apps/web/src/app/api/agent/run/route.ts` — agent endpoint (Gemini/Claude, SSE streaming, tool executor)
- `apps/web/src/app/api/projects/route.ts` — GET/POST projects
- `apps/web/src/app/api/projects/[id]/files/route.ts` — GET/PUT files

### AI Engine
- `packages/ai-engine/src/providers/gemini.ts` — GeminiProvider (write_file tool loop)
- `packages/ai-engine/src/providers/claude.ts` — ClaudeProvider
- `packages/ai-engine/src/agent.ts` — RorkAgent (11-tool agentic loop)
- `packages/ai-engine/src/prompts/index.ts` — assembled FULL_SYSTEM_PROMPT
- `packages/ai-engine/src/prompts/expo-sdk54.ts` — SDK rules, library preferences, project structure
- `packages/ai-engine/src/prompts/navigation.ts` — Tabs, Stack, Link, modals, route patterns
- `packages/ai-engine/src/prompts/styling.ts` — StyleSheet, shadows, typography, colors, animations
- `packages/ai-engine/src/prompts/components.ts` — Ionicons, expo-image, expo-av, BlurView, controls
- `packages/ai-engine/src/prompts/expo-knowledge.ts` — Common UI patterns, data fetching, storage, Snack allowlist
