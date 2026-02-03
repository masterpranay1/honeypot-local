# AGENTS.md - Repository Guidelines

## Project Overview
**ScamSnare** - AI Agentic Honeypot for Scam Detection & Intelligence Extraction.

A Next.js 16 project using React 19, TypeScript 5, and Tailwind CSS v4. The AI agent adopts the persona of "Ramesh Uncle" (62-year-old retired clerk) to engage scammers, extract payment identifiers (UPI IDs, crypto wallets), and report findings.

## Build Commands
- **Development**: `bun run dev` (starts dev server on localhost:3000)
- **Build**: `bun run build` (production build)
- **Start**: `bun run start` (starts production server)
- **Lint**: `bun run lint` (ESLint with Next.js config)

## Testing
No test runner configured yet. To add tests:
1. Install: `bun add -d vitest @testing-library/react @testing-library/jest-dom`
2. Run all: `bun vitest`
3. Run single: `bun vitest run path/to/test.ts`
4. Watch mode: `bun vitest --watch`

## Code Style Guidelines

### TypeScript
- Strict mode enabled
- Use explicit types for function parameters and return values
- Prefer `type` over `interface` for simple structures
- Use path aliases: `@/*` maps to root directory

### React Components
- Use functional components with default exports
- Add `"use client"` directive for client-side interactivity
- Props type: Use inline `Readonly<{ prop: type }>` or named types for complex cases
- Event handlers: Type explicitly (e.g., `React.SyntheticEvent<HTMLFormElement>`)

### Naming Conventions
- Components: PascalCase (e.g., `Home`, `Layout`)
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE for true constants
- Files: camelCase for utilities, PascalCase for components

### Imports Order
1. React/Next.js imports
2. Third-party libraries (ai-sdk, zod, etc.)
3. Local components/utilities (use `@/*` alias)
4. Types

### Tailwind CSS v4
- Use `@import "tailwindcss"` in CSS files
- Custom colors in `@theme inline` block
- Use standard utility classes (e.g., `flex`, `p-4`, `rounded-full`)
- Dark mode: Uses `prefers-color-scheme` media query

### Error Handling
- Validate form inputs before processing
- Type assertions: Use `as` sparingly, prefer type guards
- Early returns for invalid states

### API Routes
- Located in `app/api/*/route.ts`
- Use standard Next.js Route Handlers
- Export async functions for HTTP methods (GET, POST, etc.)

## Project Structure
```
app/
  api/           # API route handlers
  layout.tsx     # Root layout with fonts
  page.tsx       # Home page components
  globals.css    # Global styles & Tailwind
public/          # Static assets
```

## Dependencies
- **Core**: next, react, react-dom, typescript
- **AI**: ai, @ai-sdk/react, zod (for schemas)
- **LLM**: Google Gemini 2.0 Flash (via @ai-sdk/google)
- **Database**: Supabase (PostgreSQL) for sessions and intelligence storage
- **Styling**: tailwindcss v4, @tailwindcss/postcss
- **Font**: Geist (via next/font/google)

## Notes
- Package manager: Bun (bun.lock present)
- No pre-commit hooks configured
- ESLint uses flat config (eslint.config.mjs)
- Node.js 20+ recommended
