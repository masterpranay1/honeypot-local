# Product Requirement Document (PRD): Project "ScamSnare"
## AI Agentic Honeypot for Scam Intelligence

**Version:** 2.0 (TypeScript Edition)
**Date:** 2026-02-01
**Status:** Approved for Development

---

## 1. Executive Summary
**Objective:** Build an autonomous AI agent ("Honeypot") using **TypeScript** and **Vercel AI SDK** that detects scam messages, engages scammers in realistic multi-turn conversations, extracts actionable intelligence (UPI IDs, crypto wallets, phone numbers), and reports findings to a central authority.

**Success Metrics:**
*   Average engagement duration > 5 turns.
*   Successful extraction of > 80% of shared payment identifiers.
*   Low latency responses (< 2s) using edge-ready architecture.

---

## 2. System Architecture

### 2.1 Tech Stack
*   **Runtime:** **Node.js (v20+)** or **Bun** (for speed).
*   **AI Framework:** **Vercel AI SDK Core (`ai`)**.
    *   *Why:* Native TypeScript support, `generateText` for simple calls, `streamText` for real-time feel, and `tool` definitions for extraction.
*   **LLM Provider:** **Google Gemini 1.5 Flash** (via `@ai-sdk/google`).
    *   *Why:* Best-in-class speed/cost ratio for chat loops.
*   **Database:** **Supabase (PostgreSQL)**.
    *   Table `sessions`: Stores conversation state.
    *   Table `intelligence`: Stores extracted entities.
*   **API Framework:** **Hono** or **Fastify** (Deployed on Vercel/Cloudflare Workers).

---

## 3. Functional Requirements

### 3.1 The "Persona" Engine
The agent adopts the persona of **"Ramesh Uncle"**:
> "You are Ramesh, a 62-year-old retired clerk. You are polite, slightly confused by technology, and very eager to 'invest' your pension. You type slowly. You use Indian English idioms ('Do the needful', 'Kindly revert'). You never reject an offer outright but always have 'technical issues' sending money."

### 3.2 Workflow Logic (The Loop)
1.  **Ingest:** Webhook receives message (WhatsApp/Telegram).
2.  **Classify (Vercel AI SDK):**
    *   Prompt: "Analyze this message. Is it a scam attempt? Reply JSON `{ isScam: boolean, type: string }`."
3.  **Engage:**
    *   If `isScam`: Fetch session history from Supabase.
    *   Generate reply using `generateText({ model: google('gemini-1.5-flash'), system: rameshPersona, messages: history })`.
4.  **Extract (Tools):**
    *   Define a tool `extract_intel` in the AI SDK call.
    *   The LLM will *automatically* call this tool if it sees a UPI ID ("pay here") or Wallet.
5.  **Report:**
    *   When `extract_intel` is called, asynchronously push data to the GUVI endpoint.

---

## 4. Implementation Specifications

### 4.1 Database Schema (Supabase)

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  scammer_phone text not null,
  messages jsonb[] default '{}',
  created_at timestamptz default now()
);

create table intelligence (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id),
  type text, -- 'upi', 'btc', 'eth', 'url'
  value text,
  reported boolean default false
);
```

### 4.2 Code Structure (TypeScript)

**`src/agent.ts`**
```typescript
import { generateText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { supabase } from './db';

const rameshPersona = `You are Ramesh, 62. Retired. Not tech savvy. 
You have money but need help sending it. Keep replies short.`;

export async function handleMessage(phone: string, text: string) {
  // 1. Load History
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('scammer_phone', phone)
    .single();

  const history = session?.messages || [];

  // 2. Generate Reply + Extract Intel
  const { text: reply, toolCalls } = await generateText({
    model: google('gemini-1.5-flash'),
    system: rameshPersona,
    messages: [...history, { role: 'user', content: text }],
    tools: {
      extractIntel: tool({
        description: 'Save scammer payment details',
        parameters: z.object({
          type: z.enum(['upi', 'crypto', 'url']),
          value: z.string(),
        }),
        execute: async ({ type, value }) => {
          await reportToHQ({ type, value, phone });
          return 'Intel saved';
        },
      }),
    },
  });

  // 3. Save & Send
  await updateSession(phone, text, reply);
  return reply;
}
```

---

## 5. Development Guide

### Step 1: Initialize
```bash
npm create hono@latest scam-snare
cd scam-snare
npm install ai @ai-sdk/google @supabase/supabase-js zod
```

### Step 2: Env Setup (`.env`)
```
GOOGLE_GENERATIVE_AI_API_KEY=...
SUPABASE_URL=...
SUPABASE_KEY=...
```

### Step 3: Run
```bash
npm run dev
```

---
**Prepared by:** Pia (AI Assistant)
**For:** Vaibhav Kumar Singh (TypeScript Developer)
