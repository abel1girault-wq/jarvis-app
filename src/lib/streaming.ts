export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export type StreamProvider = "ANTHROPIC" | "GOOGLE" | "OPENAI" | "GROQ" | "CUSTOM";

export type StreamConfig = {
  provider: StreamProvider;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  baseUrl?: string | null;
};

const TIMEOUT_MS = 90_000;

// Returns a ReadableStream of text chunks
export async function streamChat(config: StreamConfig): Promise<ReadableStream<Uint8Array>> {
  const enc = new TextEncoder();

  function sse(text: string) {
    return enc.encode(`data: ${JSON.stringify({ text })}\n\n`);
  }
  function done() {
    return enc.encode("data: [DONE]\n\n");
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    if (config.provider === "ANTHROPIC") {
      return streamAnthropic(config, sse, done, ctrl);
    } else if (config.provider === "GOOGLE") {
      return streamGoogle(config, sse, done, ctrl);
    } else {
      // OpenAI-compatible (OpenAI, Groq, Custom)
      return streamOpenAICompat(config, sse, done, ctrl);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function streamAnthropic(
  config: StreamConfig,
  sse: (t: string) => Uint8Array,
  done: () => Uint8Array,
  ctrl: AbortController
): Promise<ReadableStream<Uint8Array>> {
  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: 8192,
    stream: true,
    messages: config.messages.map((m) => ({ role: m.role === "system" ? "user" : m.role, content: m.content })),
  };
  if (config.systemPrompt) body.system = config.systemPrompt;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Anthropic error ${res.status}`);
  }

  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done: rdone, value } = await reader.read();
        if (rdone) { controller.enqueue(done()); controller.close(); return; }
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              controller.enqueue(sse(parsed.delta.text));
              return; // yield control back so caller sees chunks
            }
          } catch { /* skip */ }
        }
      }
    },
    cancel() { reader.cancel(); },
  });
}

async function streamGoogle(
  config: StreamConfig,
  sse: (t: string) => Uint8Array,
  done: () => Uint8Array,
  ctrl: AbortController
): Promise<ReadableStream<Uint8Array>> {
  // Map messages: system messages become the systemInstruction
  const systemParts = config.messages.filter((m) => m.role === "system").map((m) => ({ text: m.content }));
  const chatMessages = config.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  if (config.systemPrompt) systemParts.unshift({ text: config.systemPrompt });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:streamGenerateContent?alt=sse`;
  const reqBody: Record<string, unknown> = { contents: chatMessages, generationConfig: { maxOutputTokens: 8192 } };
  if (systemParts.length > 0) reqBody.systemInstruction = { parts: systemParts };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
    body: JSON.stringify(reqBody),
    signal: ctrl.signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Google error ${res.status}`);
  }

  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done: rdone, value } = await reader.read();
        if (rdone) { controller.enqueue(done()); controller.close(); return; }
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) { controller.enqueue(sse(text)); return; }
          } catch { /* skip */ }
        }
      }
    },
    cancel() { reader.cancel(); },
  });
}

async function streamOpenAICompat(
  config: StreamConfig,
  sse: (t: string) => Uint8Array,
  done: () => Uint8Array,
  ctrl: AbortController
): Promise<ReadableStream<Uint8Array>> {
  let baseUrl = "https://api.openai.com/v1";
  if (config.provider === "GROQ") baseUrl = "https://api.groq.com/openai/v1";
  else if (config.baseUrl) baseUrl = config.baseUrl.replace(/\/+$/, "");

  const msgs = config.systemPrompt
    ? [{ role: "system", content: config.systemPrompt }, ...config.messages]
    : config.messages;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, messages: msgs, stream: true }),
    signal: ctrl.signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Error ${res.status}`);
  }

  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done: rdone, value } = await reader.read();
        if (rdone) { controller.enqueue(done()); controller.close(); return; }
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") { controller.enqueue(done()); controller.close(); return; }
          try {
            const parsed = JSON.parse(raw);
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) { controller.enqueue(sse(text)); return; }
          } catch { /* skip */ }
        }
      }
    },
    cancel() { reader.cancel(); },
  });
}
