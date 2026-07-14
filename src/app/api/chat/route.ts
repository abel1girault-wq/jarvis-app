// @ts-nocheck
export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, messages, apiKeys } from "@/lib/db/schema";
import { requireApprovedUser } from "@/lib/api-guards";
import { decrypt } from "@/lib/crypto";
import { getValidAccessToken, fetchCalendarEvents, fetchClassroomCourses, fetchClassroomAssignments } from "@/lib/google-oauth";
import { STUDY_MODES } from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 90;

function isCalendarQuery(t: string) { return /calendar|schedule|appointment|event|meeting|today|tomorrow|tonight|\d+pm|\d+am|what do i have/i.test(t); }
function isClassroomQuery(t: string) { return /homework|assignment|due|submit|classroom|course|class|teacher|grade/i.test(t); }

async function buildGoogleContext(userId: string, msg: string) {
  try {
    const token = await getValidAccessToken(userId).catch(() => null);
    if (!token) return "";
    const parts = [];
    if (isCalendarQuery(msg)) {
      const now = new Date(); const end = new Date(now.getTime() + 7*86400000);
      const ev = await fetchCalendarEvents(token, now.toISOString(), end.toISOString());
      if (ev?.length) parts.push("[User calendar - next 7 days]\n" + ev.map(e => "- " + e.summary + " at " + (e.start.dateTime ?? e.start.date)).join("\n"));
    }
    if (isClassroomQuery(msg)) {
      const courses = await fetchClassroomCourses(token);
      if (courses?.length) {
        const lines = [];
        for (const c of courses.slice(0,4)) {
          const a = await fetchClassroomAssignments(token, c.id).catch(() => null);
          const u = (a ?? []).filter(x => x.state==="PUBLISHED").slice(0,3).map(x => "  - " + x.title + (x.dueDate ? " (due "+x.dueDate.month+"/"+x.dueDate.day+")" : "")).join("\n");
          lines.push(c.name + ":\n" + (u || "  - No assignments"));
        }
        parts.push("[Google Classroom]\n" + lines.join("\n\n"));
      }
    }
    return parts.join("\n\n");
  } catch { return ""; }
}

async function callOneAI(apiKey: string, provider: string, model: string, baseUrl: string | null, msgs: {role: string; content: string}[], systemPrompt: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 40000);
  try {
    if (provider === "ANTHROPIC") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", signal: ctrl.signal,
        headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},
        body:JSON.stringify({model, max_tokens:4096, system:systemPrompt, messages:msgs.map(m=>({role:m.role==="system"?"user":m.role, content:m.content}))})
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error?.message ?? "Anthropic error "+r.status);
      return d.content?.filter((b: {type:string;text:string})=>b.type==="text").map((b: {type:string;text:string})=>b.text).join("").trim();
    }
    if (provider === "GOOGLE") {
      const url = "https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent";
      const r = await fetch(url, {
        method:"POST", signal: ctrl.signal,
        headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
        body:JSON.stringify({contents:msgs.filter(m=>m.role!=="system").map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]})), systemInstruction:{parts:[{text:systemPrompt}]}})
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error?.message ?? "Google error "+r.status);
      return d.candidates?.[0]?.content?.parts?.map(p=>part.text??"").join("").trim() ?? "";
    }
    const base = provider==="GROQ" ? "https://api.groq.com/openai/v1" : (baseUrl ?? "https://api.openai.com/v1");
    const r = await fetch(base+"/chat/completions", {
      method:"POST", signal: ctrl.signal,
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+apiKey},
      body:JSON.stringify({model, messages:[{role:"system",content:systemPrompt},...msgs]})
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error?.message ?? "Error "+r.status);
    return d.choices?.[0]?.message?.content?.trim() ?? "";
  } finally { clearTimeout(timer); }
}

async function runJudge(judgeKey: string, judgeProvider: string, judgeModel: string, judgeBaseUrl: string | null, prompt: string, responses: {name: string; text: string}[]) {
  const letters = "ABCDEFGHIJ";
  const labeled = responses.map((r,i) => ({letter:letters[i],...r}));
  const transcript = labeled.map(l => "Response "+l.letter+" ("+l.name+"):\n"+l.text).join("\n\n---\n\n");
  const judgePrompt = 'You are a judge. Original task: "'+prompt+'"\n\n'+transcript+'\n\nRespond with ONLY valid JSON: {"winner":"A","reasoning":"brief explanation"}';
  const result = await callOneAI(judgeKey, judgeProvider, judgeModel, judgeBaseUrl, [{role:"user",content:judgePrompt}], "You are an impartial judge. Respond only with JSON.");
  try {
    const p = JSON.parse(result.replace(/```json|```/g,"").trim());
    const match = labeled.find(l=>l.letter===p.winner);
    return {winner:match?.name??responses[0].name, reasoning:p.reasoning??"", winnerText:match?.text??responses[0].text};
  } catch { return {winner:responses[0].name, reasoning:"", winnerText:responses[0].text}; }
}

export async function POST(req) {
  const {user, error} = await requireApprovedUser();
  if (error) return error;
  const body = await req.json().catch(()=>null);
  const conversationId = body?.conversationId;
  const userMessage = body?.message?.trim();
  const studyModeId = body?.studyMode ?? null;
  if (!conversationId || !userMessage) return new Response(JSON.stringify({error:"Missing fields."}), {status:400});

  const [conv] = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id))).limit(1);
  if (!conv) return new Response(JSON.stringify({error:"Not found."}), {status:404});

  const allKeys = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));
  const aiList = [];
  const seen = new Set();
  const MODEL_MAP = {ANTHROPIC:"claude-sonnet-4-6", GOOGLE:"gemini-2.0-flash", OPENAI:"gpt-4o-mini", GROQ:"llama-3.3-70b-versatile"};
  for (const k of allKeys) {
    if (seen.has(k.provider)) continue; seen.add(k.provider);
    aiList.push({name:k.label, provider:k.provider, key:decrypt(k.encryptedKey), model:MODEL_MAP[k.provider]??conv.model, baseUrl:k.baseUrl??null});
  }
  const ENV = [
    process.env.ANTHROPIC_KEY && {provider:"ANTHROPIC",label:"Claude",key:process.env.ANTHROPIC_KEY,model:"claude-sonnet-4-6",baseUrl:null},
    process.env.GOOGLE_AI_KEY && {provider:"GOOGLE",label:"Gemini",key:process.env.GOOGLE_AI_KEY,model:"gemini-2.0-flash",baseUrl:null},
    process.env.OPENAI_KEY && {provider:"OPENAI",label:"GPT",key:process.env.OPENAI_KEY,model:"gpt-4o-mini",baseUrl:null},
    process.env.GROQ_KEY && {provider:"GROQ",label:"Groq",key:process.env.GROQ_KEY,model:"llama-3.3-70b-versatile",baseUrl:"https://api.groq.com/openai/v1"},
  ].filter(Boolean);
  for (const e of ENV) { if (!seen.has(e.provider)) { seen.add(e.provider); aiList.push({name:e.label,...e}); } }
  if (aiList.length === 0) return new Response(JSON.stringify({error:"No API keys found. Go to Settings to add one."}), {status:400});

  const history = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  const chatHistory = history.filter(m=>m.content.type==="text").slice(-20).map(m=>({role:m.role, content:m.content.text}));
  await db.insert(messages).values({conversationId, role:"user", content:{type:"text", text:userMessage}});
  if (history.length===0 && conv.title==="New chat") {
    await db.update(conversations).set({title:userMessage.slice(0,60), updatedAt:new Date()}).where(eq(conversations.id, conversationId));
  } else { await db.update(conversations).set({updatedAt:new Date()}).where(eq(conversations.id, conversationId)); }

  const studyMode = STUDY_MODES.find(m=>m.id===studyModeId);
  let systemPrompt = studyMode?.prompt ?? "You are Jarvis, a helpful AI assistant. Use markdown formatting. Be friendly, clear, and concise.";
  const googleContext = await buildGoogleContext(user.id, userMessage);
  if (googleContext) systemPrompt += "\n\n" + googleContext + "\n\nUse the above context when relevant.";
  const msgList = [...chatHistory, {role:"user", content:userMessage}];
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let finalText = ""; let winnerName = ""; let reasoning = ""; let totalAIs = aiList.length;
        if (aiList.length === 1) {
          controller.enqueue(enc.encode("data: " + JSON.stringify({status:"Asking "+aiList[0].name+"..."}) + "\n\n"));
          finalText = await callOneAI(aiList[0].key, aiList[0].provider, aiList[0].model, aiList[0].baseUrl, msgList, systemPrompt);
          winnerName = aiList[0].name;
        } else {
          controller.enqueue(enc.encode("data: " + JSON.stringify({status:"Asking "+aiList.length+" AIs in parallel..."}) + "\n\n"));
          const results = await Promise.allSettled(aiList.map(async ai => ({name:ai.name, text:await callOneAI(ai.key, ai.provider, ai.model, ai.baseUrl, msgList, systemPrompt)})));
          const ok = results.filter(r=>r.status==="fulfilled"&&r.value.text.length>0).map(r=>r.value);
          if (ok.length===0) { controller.enqueue(enc.encode("data: " + JSON.stringify({error:"All AIs failed or have no credits. Add a working API key in Settings."}) + "\n\n")); controller.enqueue(enc.encode("data: [DONE]\n\n")); controller.close(); return; }
          if (ok.length===1) { finalText=ok[0].text; winnerName=ok[0].name; totalAIs=1; }
          else {
            controller.enqueue(enc.encode("data: " + JSON.stringify({status:"Judging "+ok.length+" responses..."}) + "\n\n"));
            const j = aiList[0];
            const v = await runJudge(j.key, j.provider, j.model, j.baseUrl, userMessage, ok);
            finalText=v.winnerText; winnerName=v.winner; reasoning=v.reasoning;
          }
        }
        const words = finalText.split(" ");
        for (let i=0; i<words.length; i++) {
          const chunk = (i===0?"":"  ")+words[i];
          controller.enqueue(enc.encode("data: " + JSON.stringify({text:chunk}) + "\n\n"));
          if (i%10===0) await new Promise(r=>setTimeout(r,8));
        }
        controller.enqueue(enc.encode("data: " + JSON.stringify({winner:winnerName, reasoning, totalAIs}) + "\n\n"));
        await db.insert(messages).values({conversationId, role:"assistant", content:{type:"text", text:finalText}});
      } catch(err) {
        controller.enqueue(enc.encode("data: " + JSON.stringify({error:err instanceof Error?err.message:"Error"}) + "\n\n"));
      } finally {
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      }
    }
  });
  return new Response(stream, {headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache","X-Accel-Buffering":"no"}});
}