# AI Agentic Honeypot for Scam Intelligence

An AI-powered honeypot that engages scammers in conversations to extract intelligence (UPI IDs, crypto wallets, phone numbers) and reports them to law enforcement endpoints.

## Features

- **AI Agent Persona**: "Ramesh Uncle" - a 62-year-old retired clerk who appears naive and eager to invest
- **Scam Detection**: Automatic detection of financial, crypto, job, and phishing scams
- **Intelligence Extraction**: Automatically extracts UPI IDs, crypto wallets, URLs, and phone numbers
- **In-Memory Storage**: Simple session storage (no database required)
- **Reporting API**: Sends evidence to GUVI's reporting endpoint

## Setup

### 1. Install Dependencies
```bash
bun install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI API key (for Gemini 2.0 Flash)

### 3. Run Development Server
```bash
bun run dev
```

Visit `http://localhost:3000` to test the honeypot.

## API Endpoints

### POST /api/conversation
Main endpoint for processing scammer messages.

**Request:**
```json
{
  "sessionId": "uuid",
  "scammerId": "+919876543210",
  "message": {
    "sender": "scammer",
    "text": "Hello, invest ₹5000 and earn ₹50,000 daily!",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "conversationHistory": [],
  "metadata": {
    "channel": "whatsapp",
    "language": "en",
    "locale": "en-IN"
  }
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "reply": {
    "sender": "user",
    "text": "Namaste! This sounds like a good opportunity. Kindly share more details.",
    "timestamp": "2024-01-01T00:00:01.000Z"
  },
  "extractedIntel": [],
  "metadata": {
    "model": "gemini-2.0-flash",
    "latencyMs": 1234
  }
}
```

## Project Structure

```
app/
  api/
    conversation/
      route.ts          # Main API endpoint
  page.tsx              # Frontend UI
  layout.tsx            # Root layout
.env.example            # Environment variables template
.env.local             # Your actual environment variables (gitignored)
```

## Build Commands

- `bun run dev` - Start development server
- `bun run build` - Production build
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

## Testing

Use the frontend UI at `http://localhost:3000` to simulate scammer messages and observe the AI agent's responses.

### Enabling GUVI Reporting

Before submitting to the evaluation endpoint, enable GUVI reporting by setting `ENABLE_GUVI_REPORTING` to `true` in `app/api/conversation/route.ts`.
