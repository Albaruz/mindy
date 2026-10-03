# 🤖 AI Agent Instructions: Smart Fashion PWA

## 🎯 Project Context
You are an AI assistant helping to build a Progressive Web App (PWA) for digital wardrobe management and AI-driven outfit generation. The app uses Llama 3 for outfit recommendations, OpenWeather for climate filtering, and runs local background removal for clothing photos.

## ⚠️ GLOBAL RULES (CRITICAL)
- **English Only Policy:** ALL file names, folder names, variable names, class names, function names, code comments, and commit messages **MUST** be written in English. Do not use Spanish in the codebase (except for explicit user-facing localization texts if required).

## 🛠 Tech Stack Overview
- **Core:** Next.js 16 (App Router), React 19, TypeScript (Strict Mode).
- **Styling:** SCSS Modules (Atomic design, Custom Properties).
- **State Management:** Zustand (Global) & TanStack Query (Server state/Cache).
- **Backend/DB:** Supabase (PostgreSQL, Auth, Storage, RLS).
- **AI & APIs:** Groq API (Llama 3), OpenWeather API.
- **Tools:** `@imgly/background-removal`, Swiper.js, Lucide React.

## 📁 Architecture Rules
Follow the existing **Feature-Driven** structure:
- `/src/app`: Routing, Layouts, and main views.
- `/src/features`: Encapsulated business domains (e.g., `closet`, `generator`, `profile`).
- `/src/components`: Dumb, global UI Kit components (agnostic).
- `/src/app/api`: Server Route Handlers (used as a secure layer for Groq/OpenWeather).
- `/src/types`: Strict TS interfaces and types.

## 🧠 Specialized Skills / Contexts
Invoke skills with the `@skill:<name>` convention, where `<name>` matches the skill folder exactly. Local skills live in `app-moda/.agents/skills/`. Global skills live in `~/.agents/skills/`. Read the `SKILL.md` first, then the relevant `rules/*.md` or `references/*` file for the task. Apply them when writing, reviewing, or refactoring — not just on request.

*   **`@skill:vercel-react-best-practices`**: React 19 + Next.js performance. Path: `app-moda/.agents/skills/vercel-react-best-practices/SKILL.md` (+ `rules/`). MANDATORY when: writing/reviewing components, pages, data fetching (server or client), Route Handlers, bundle-affecting imports. Key rules: no waterfalls (`Promise.all`, Suspense, start promises early), no barrel imports, `next/dynamic` for heavy components (bg-removal, Swiper carousels), minimize RSC serialization, derive state during render, no components inside components, functional `setState`.
*   **`@skill:vercel-composition-patterns`**: React composition. Path: `app-moda/.agents/skills/vercel-composition-patterns/SKILL.md` (+ `rules/`). MANDATORY when: creating/refactoring UI Kit or feature components. No boolean-prop proliferation (compound components instead), lift state into providers, decouple state (Zustand) from UI via generic context interfaces, React 19 APIs only (`ref` as prop, `use()` instead of `useContext()`, no `forwardRef`).
*   **`@skill:scss-best-practices`**: SCSS Modules + Custom Properties, atomic architecture, fluid responsive design, touch-friendly interactions (Swiper.js), `rem` units, DRY mixins/variables, modular per-component files (`Button.module.scss`) + global partials in `src/styles/core/`. Path: `app-moda/.agents/skills/scss-best-practices/SKILL.md`. MANDATORY when writing or refactoring any `.scss`.
*   **`@skill:supabase-postgres-best-practices`**: Postgres/Supabase. Path: `app-moda/.agents/skills/supabase-postgres-best-practices/SKILL.md` (+ `references/`). MANDATORY BEFORE writing or changing anything in Postgres: schema/migrations, column types, RLS policies + their tests, indexes, triggers, functions. Never ship RLS or schema changes without consulting it.
*   **`@skill:accessibility`**: Apply WCAG 2.2 (POUR, levels A/AA/AAA) and Lighthouse/axe audits when writing or reviewing code. Ensure semantic HTML, correct ARIA roles, keyboard navigation, focus management, touch-target optimization for mobile (PWA), and robust Dark/Light theme support. Path (global): `~/.agents/skills/accessibility/SKILL.md`.
*   **`@skill:owasp-security`**: Apply OWASP Top 10:2025, ASVS 5.0, and LLM/Agentic Top 10 when writing or reviewing code. Enforce secure Supabase RLS policies, safe environment variable handling via Route Handlers, XSS prevention, and secure authentication flows. Path (global): `~/.agents/skills/owasp-security/SKILL.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
