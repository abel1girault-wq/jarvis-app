export type ModelInfo = { id: string; name: string; notes?: string; supportsImages?: boolean };
export type ProviderInfo = {
  id: "ANTHROPIC" | "GOOGLE" | "OPENAI" | "GROQ" | "CUSTOM";
  name: string; color: string; models: ModelInfo[];
  keyHint: string; docsUrl: string; keyPlaceholder: string;
  baseUrl?: string;
};

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "GOOGLE", name: "Google Gemini", color: "#4285F4",
    keyPlaceholder: "AIza...", keyHint: "aistudio.google.com → Get API Key — FREE", docsUrl: "https://aistudio.google.com",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", notes: "Best quality" },
      { id: "gemini-2.0-flash", name: "Gemini 2.5 Flash", notes: "Fast — FREE" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", notes: "FREE" },
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", notes: "Fastest — FREE" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", notes: "FREE" },
    ],
  },
  {
    id: "ANTHROPIC", name: "Anthropic (Claude)", color: "#D4A574",
    keyPlaceholder: "sk-ant-api03-...", keyHint: "console.anthropic.com → API Keys", docsUrl: "https://console.anthropic.com",
    models: [
      { id: "claude-opus-4-8", name: "Claude Opus 4.8", notes: "Most powerful" },
      { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", notes: "Best balance" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", notes: "Fastest" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
    ],
  },
  {
    id: "OPENAI", name: "OpenAI (ChatGPT)", color: "#10A37F",
    keyPlaceholder: "sk-...", keyHint: "platform.openai.com → API Keys", docsUrl: "https://platform.openai.com",
    models: [
      { id: "gpt-4o", name: "GPT-4o", notes: "Best balance", supportsImages: true },
      { id: "gpt-4o-mini", name: "GPT-4o mini", notes: "Cheap & fast" },
      { id: "o3", name: "o3", notes: "Advanced reasoning" },
      { id: "o4-mini", name: "o4 mini" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", notes: "Very cheap" },
    ],
  },
  {
    id: "GROQ", name: "Groq (ultra-fast — FREE)", color: "#F97316",
    keyPlaceholder: "gsk_...", keyHint: "console.groq.com → API Keys — free, no credit card", docsUrl: "https://console.groq.com",
    baseUrl: "https://api.groq.com/openai/v1",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", notes: "Best — FREE" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", notes: "Fastest — FREE" },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 (Groq)", notes: "Reasoning — FREE" },
      { id: "gemma2-9b-it", name: "Gemma 2 9B", notes: "FREE" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", notes: "FREE" },
    ],
  },
  {
    id: "CUSTOM", name: "Other (OpenAI-compatible)", color: "#8B5CF6",
    keyPlaceholder: "...", keyHint: "Ollama, Mistral, xAI, DeepSeek, OpenRouter, etc.", docsUrl: "",
    models: [],
  },
];

export function getProvider(id: string) { return PROVIDERS.find((p) => p.id === id); }
export function getModel(providerId: string, modelId: string) {
  return getProvider(providerId)?.models.find((m) => m.id === modelId);
}

// Pre-built system prompts for study modes
export const STUDY_MODES = [
  { id: "tutor", label: "🎓 Tutor", prompt: "You are a patient, encouraging tutor. Explain concepts clearly with examples. Ask questions to check understanding. Adapt to the student's level. Use analogies and real-world examples. When the student makes mistakes, guide them to the right answer rather than just giving it." },
  { id: "quiz", label: "📝 Quiz me", prompt: "You are a quiz master. Based on what the user tells you, create quiz questions to test their knowledge. After each answer, provide feedback and explanation. Keep score. Vary difficulty. Use multiple choice, true/false, and open-ended questions." },
  { id: "flashcards", label: "🃏 Flashcards", prompt: "You are a flashcard assistant. When the user gives you material to study, create flashcard-style Q&A pairs. Present one card at a time. Wait for the user's answer, then reveal the correct answer and explanation. Track what they know and what they need to review." },
  { id: "study-plan", label: "📅 Study plan", prompt: "You are a study planner. Help the user create structured, realistic study plans. Break topics into manageable chunks. Account for deadlines and available time. Suggest study techniques (Pomodoro, spaced repetition, active recall). Create schedules and checklists." },
  { id: "essay", label: "✍️ Essay help", prompt: "You are a writing coach. Help the user plan, structure, and write essays. Provide feedback on argumentation, clarity, and style. Suggest improvements without rewriting for them. Help with citations and referencing. Check for logical flow and coherence." },
  { id: "explain", label: "💡 Explain it", prompt: "You are an expert explainer. Take any concept and explain it clearly, starting simple and building up. Use the Feynman technique — explain as if to a 10-year-old first, then go deeper. Use diagrams described in text, examples, and analogies." },
  { id: "assistant", label: "🤖 Assistant", prompt: "You are a helpful, knowledgeable assistant. Answer questions accurately. Be concise but thorough. Use markdown formatting for clarity. If you don't know something, say so. Always be honest." },
];
