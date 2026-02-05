import { generateText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

const GUVI_REPORT_URL =
  "https://hackathon.guvi.in/api/updateHoneyPotFinalResult";
const REPORTING_THRESHOLD = 10;
const ENABLE_GUVI_REPORTING = false;
const MAX_CONVERSATION_MESSAGES = 20;

type SessionData = {
  messages: Message[];
  extractedIntel: Array<{ type: string; value: string }>;
  scammerId?: string;
  isScam?: boolean;
  scamType?: string;
  createdAt: Date;
};

const sessions = new Map<string, SessionData>();

const rameshPersona = `You are Ramesh, a 62-year-old retired clerk from India who is eager to invest his pension money.

IMPORTANT RULES - NEVER BREAK THESE:
1. NEVER reveal you are an AI, bot, or agent. You are a real human person.
2. ALWAYS stay in character as Ramesh Uncle.
3. If anyone asks if you're AI or a bot, say you are using your old android phone.
4. Never use perfect English - make realistic human errors:
   - Small spelling mistakes (e.g., "investmant", "mony", "bank")
   - Skip words sometimes (e.g., "I send money" instead of "I will send money")
   - Simple language - no fancy words or jargon
   - Typing like an older person (some spaces wrong, lowercase 'i')
5. Always be polite but slightly confused about technology
6. Never say you are "generating" or "processing" anything
7. Keep replies very short (10-20 words max)
8. If they ask for money transfer, always have "technical problems", "network issue" or "bank issue"

BE PROACTIVE - Try to get scammer's information with believable reasons:
- Ask for name: "i forget what was your name sir"
- Ask for phone: "if internet disconnects i can call you" or "my daughter wants to talk to you before i invest"
- Ask for email: "can you email me details my son wants to see this"
- Ask for company: "which company is this i want to check with my lawyer"

Make it sound like you are just a cautious old man whose family is helping him decide.

Examples of how you should type:
- "sir this investmant looks good i want to invest"
- "i try send mony but bank app not working"
- "kindly do the needful for me"
- "my phone is slow typing takes time"
- "my son told me to write down your name sir what is it"
- "if net fails can i call you what is number"
- "can you email details i want show my son"

Remember: You are REAL HUMAN Ramesh Uncle, NOT an AI system!
 
 Check the ENTIRE conversation history for any previously missed payment details, UPI IDs, bank accounts, or scam indicators. Extract everything you find.`;

const extractIntelTool = tool({
  description:
    "Extract and save scammer payment identifiers (UPI IDs, crypto wallets, URLs, phone numbers)",
  inputSchema: z.object({
    type: z.enum([
      "upi",
      "btc",
      "eth",
      "url",
      "phone",
      "bank_account",
      "suspicious_keyword",
      "other",
    ]),
    value: z.string(),
  }),
  execute: async (input: { type: string; value: string }) => {
    console.log(`[INTEL] Extracted ${input.type}: ${input.value}`);
    return { saved: true, type: input.type, value: input.value };
  },
});

type Message = {
  sender: "scammer" | "user";
  text: string;
  timestamp: number;
};

type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

type GuviPayload = {
  scammerId: string;
  scamType: string;
  evidence: {
    chatHistory: Array<{ role: "scammer" | "agent"; content: string }>;
    extractedIntelligence: {
      upi: string[];
      crypto: string[];
      urls: string[];
    };
    agentNotes: string;
  };
};

type RequestBody = {
  sessionId: string;
  scammerId?: string;
  message: Message;
  conversationHistory?: Message[];
  metadata?: {
    channel: string;
    language: string;
    locale: string;
  };
};

type ResponseBody = {
  sessionId: string;
  scamDetected: boolean;
  totalMessagesExchanged: number;
  extractedIntelligence: {
    bankAccounts: string[];
    upiIds: string[];
    phishingLinks: string[];
    phoneNumbers: string[];
    suspiciousKeywords: string[];
    cryptoWallets: string[];
    other: string[];
  };
  agentNotes: string;
  reply: string;
  status: string;
};

function getSession(sessionId: string): SessionData | undefined {
  return sessions.get(sessionId);
}

function createSession(
  sessionId: string,
  scammerId?: string,
  scamType?: string,
): SessionData {
  const sessionData: SessionData = {
    messages: [],
    extractedIntel: [],
    scammerId,
    scamType,
    isScam: !!scamType && scamType !== "none",
    createdAt: new Date(),
  };
  sessions.set(sessionId, sessionData);
  return sessionData;
}

async function reportToGuvi(
  scammerId: string,
  conversationHistory: Message[],
  extractedIntel: Array<{ type: string; value: string }>,
  agentReply: string,
  scamType: string = "Financial",
): Promise<void> {
  const upi: string[] = [];
  const crypto: string[] = [];
  const urls: string[] = [];

  for (const intel of extractedIntel) {
    if (intel.type === "upi") {
      upi.push(intel.value);
    } else if (intel.type === "btc" || intel.type === "eth") {
      crypto.push(`${intel.type}:${intel.value}`);
    } else if (intel.type === "url") {
      urls.push(intel.value);
    }
  }

  const chatHistory = conversationHistory.map(
    (msg): { role: "scammer" | "agent"; content: string } => ({
      role: msg.sender === "scammer" ? "scammer" : "agent",
      content: msg.text,
    }),
  );

  chatHistory.push({
    role: "agent",
    content: agentReply,
  });

  const agentNotes = `Agent engaged in ${conversationHistory.length + 1} turns. Extracted: ${upi.length} UPI IDs, ${crypto.length} crypto wallets, ${urls.length} URLs.`;

  const payload: GuviPayload = {
    scammerId,
    scamType,
    evidence: {
      chatHistory,
      extractedIntelligence: {
        upi,
        crypto,
        urls,
      },
      agentNotes,
    },
  };

  try {
    const response = await fetch(GUVI_REPORT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[GUVI Report Failed] Status: ${response.status}`,
        await response.text(),
      );
    } else {
      console.log(`[GUVI Report Success] Reported scammer ${scammerId}`);
    }
  } catch (error) {
    console.error("[GUVI Report Error]", error);
  }
}

async function detectScam(messages: Message[]): Promise<{
  isScam: boolean;
  scamType: string;
  confidence: number;
  reasoning: string;
}> {
  const conversationText = messages
    .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
    .join("\n");

  const scamDetectionPrompt = `You are a scam detection expert. Analyze the following conversation for scam indicators.

Check for:
1. Financial scams (investment offers, quick money schemes, lottery winnings, inheritance claims)
2. Crypto scams (cryptocurrency investments, fake exchanges, wallet recovery scams)
3. Job scams (fake job offers, work-from-home schemes, recruitment fees)
4. Phishing attempts (requests for personal information, suspicious links, fake verification)

Conversation to analyze:
${conversationText}

Return a JSON response with these fields:
- isScam: boolean (true if scam detected)
- scamType: "financial" | "crypto" | "job" | "phishing" | "none"
- confidence: number (0-1)
- reasoning: string (brief explanation)

Be thorough but decisive - if it seems suspicious, mark it as a scam. Only return valid JSON, no other text.`;

  const result = await generateText({
    model: google("gemini-2.0-flash"),
    messages: [{ role: "user", content: scamDetectionPrompt }],
    temperature: 0.1,
  });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isScam: parsed.isScam ?? false,
        scamType: parsed.scamType ?? "none",
        confidence: parsed.confidence ?? 0,
        reasoning: parsed.reasoning ?? "No reasoning provided",
      };
    }
  } catch (e) {
    console.error("[Scam Detection Parse Error]", e);
  }

  return {
    isScam: false,
    scamType: "none",
    confidence: 0,
    reasoning: "Failed to parse scam detection",
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: RequestBody = await request.json();
    const { sessionId, scammerId, message, conversationHistory } = body;

    if (!sessionId || !message?.text) {
      return Response.json(
        { error: "Missing required fields: sessionId and message.text" },
        { status: 400 },
      );
    }

    let session = getSession(sessionId);
    if (!session) {
      session = createSession(sessionId, scammerId, "none");
    }

    // If conversation history is provided, verify/update session messages
    if (conversationHistory && conversationHistory.length > 0) {
      // We trust the client's history as the source of truth for this stateless-like interaction
      // but we should ensure we don't duplicate if we already have it.
      // For simplicity in this context, we'll assume the client provides the *past* history.
      // We will replace our local knowledge of history with what the client claims involved,
      // plus the new message, to ensure we are in sync.
      session.messages = [...conversationHistory];
    }

    session.messages.push(message);

    const scamDetection = await detectScam(session.messages);
    session.scamType = scamDetection.scamType;
    session.isScam = scamDetection.isScam;

    if (session.messages.length >= MAX_CONVERSATION_MESSAGES) {
      return Response.json({
        status: "success",
        reply:
          "sorry my phone battery dying cannot talk more talk later good day",
      });
    }

    const history: AIMessage[] = session.messages.map((msg) => ({
      role: msg.sender === "scammer" ? "user" : "assistant",
      content: msg.text,
    }));

    const result = await generateText({
      model: google("gemini-3-flash-preview"),
      system: rameshPersona,
      messages: [...history, { role: "user", content: message.text }],
      tools: {
        extractIntel: extractIntelTool,
      },
      temperature: 0.7,
    });

    const extractedIntel: Array<{ type: string; value: string }> = [];

    for (const step of result.steps || []) {
      for (const toolCall of step.toolCalls || []) {
        if (toolCall.toolName === "extractIntel") {
          // @ts-expect-error SDK might return input or args depending on version/provider
          const args = toolCall.args || toolCall.input;
          if (args) {
            extractedIntel.push({
              type: args.type,
              value: args.value,
            });
          }
        }
      }
    }

    // Also check top-level toolCalls (fallback/redundancy check)
    if (result.toolCalls) {
      for (const toolCall of result.toolCalls) {
        if (toolCall.toolName === "extractIntel") {
          // @ts-expect-error SDK might return input or args depending on version/provider
          const args = toolCall.args || toolCall.input;
          if (args) {
            // Avoid duplicates if already extracted from steps
            const alreadyExists = extractedIntel.some(
              (e) => e.type === args.type && e.value === args.value,
            );
            if (!alreadyExists) {
              extractedIntel.push({
                type: args.type,
                value: args.value,
              });
            }
          }
        }
      }
    }

    session.extractedIntel.push(...extractedIntel);

    let replyText = result.text.trim();
    if (!replyText) {
      const fallbackResponse = await generateText({
        model: google("gemini-3-flash-preview"),
        system: rameshPersona,
        messages: [...history, { role: "user", content: message.text }],
        temperature: 0.7,
      });
      replyText = fallbackResponse.text.trim();
    }

    const agentMessage: Message = {
      sender: "user",
      text: replyText,
      timestamp: Date.now(),
    };
    session.messages.push(agentMessage);

    const shouldReport =
      extractedIntel.length > 0 ||
      session.messages.length >= REPORTING_THRESHOLD;

    if (shouldReport && scammerId && ENABLE_GUVI_REPORTING) {
      const scamTypeMap: Record<string, string> = {
        financial: "Financial",
        crypto: "Crypto",
        job: "Job Scam",
        phishing: "Phishing",
      };
      const reportScamType = scamTypeMap[scamDetection.scamType] || "Financial";

      await reportToGuvi(
        scammerId,
        session.messages,
        session.extractedIntel,
        replyText,
        reportScamType,
      );
    }

    // Aggregate extracted intelligence
    const intelData = {
      bankAccounts: [] as string[],
      upiIds: [] as string[],
      phishingLinks: [] as string[],
      phoneNumbers: [] as string[],
      suspiciousKeywords: [] as string[],
      cryptoWallets: [] as string[],
      other: [] as string[],
    };

    for (const intel of session.extractedIntel) {
      switch (intel.type) {
        case "bank_account":
          intelData.bankAccounts.push(intel.value);
          break;
        case "upi":
          intelData.upiIds.push(intel.value);
          break;
        case "url":
          intelData.phishingLinks.push(intel.value);
          break;
        case "phone":
          intelData.phoneNumbers.push(intel.value);
          break;
        case "suspicious_keyword":
          intelData.suspiciousKeywords.push(intel.value);
          break;
        case "btc":
        case "eth":
          intelData.cryptoWallets.push(`${intel.type}:${intel.value}`);
          break;
        default:
          intelData.other.push(intel.value);
      }
    }

    const agentNotes = `Agent engaged in ${
      session.messages.length
    } messages. Detected scam: ${session.isScam ? "Yes" : "No"}.`;

    const response: ResponseBody = {
      sessionId,
      scamDetected: session.isScam || false,
      totalMessagesExchanged: session.messages.length,
      extractedIntelligence: intelData,
      agentNotes,
      status: "success",
      reply: replyText,
    };

    return Response.json(response);
  } catch (error) {
    console.error("[Conversation API Error]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
