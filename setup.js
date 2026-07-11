#!/usr/bin/env node
// Run with: node setup.js
// Creates your .env and .env.local files interactively

const readline = require("readline");
const fs = require("fs");
const crypto = require("crypto");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  console.log("\n╔═══════════════════════════════════╗");
  console.log("║       Aura — Setup Wizard         ║");
  console.log("╚═══════════════════════════════════╝\n");

  console.log("This will create your .env file. You need:\n");
  console.log("  1. A Neon database URL (free at neon.tech)");
  console.log("  2. At least one AI API key\n");
  console.log("Press Enter to skip optional fields.\n");

  const dbUrl = await ask("📦 Neon DATABASE_URL: ");
  if (!dbUrl.trim()) { console.log("\n❌ DATABASE_URL is required. Get a free one at neon.tech"); rl.close(); return; }

  const adminEmail = await ask(`👤 Your admin email [abel1.girault@gmail.com]: `) || "abel1.girault@gmail.com";

  console.log("\n--- AI Provider Keys (press Enter to skip) ---");
  const anthropicKey = await ask("🤖 Anthropic key (sk-ant-...): ");
  const googleAiKey = await ask("🔷 Google AI key (AIza...): ");
  const openaiKey = await ask("🟢 OpenAI key (sk-...): ");
  const groqKey = await ask("🟠 Groq key (gsk_...): ");

  console.log("\n--- Google OAuth (for Calendar & Classroom, optional) ---");
  console.log("Get credentials at console.cloud.google.com → APIs → Credentials");
  const googleClientId = await ask("🔑 Google Client ID (leave blank to skip): ");
  const googleClientSecret = googleClientId ? await ask("🔒 Google Client Secret: ") : "";

  const appUrl = await ask(`🌐 App URL [http://localhost:3000]: `) || "http://localhost:3000";

  const jwtSecret = crypto.randomBytes(32).toString("base64");
  const encKey = crypto.randomBytes(32).toString("hex");

  let content = `# Database
DATABASE_URL="${dbUrl.trim()}"

# Auth secrets (auto-generated — do not share)
JWT_SECRET="${jwtSecret}"
ENCRYPTION_KEY="${encKey}"

# Admin email — this account auto-approves on register
ADMIN_EMAIL="${adminEmail.trim()}"

# App URL
NEXT_PUBLIC_URL="${appUrl.trim()}"
`;

  if (anthropicKey.trim()) content += `\n# Anthropic (Claude)\nANTHROPIC_KEY="${anthropicKey.trim()}"`;
  if (googleAiKey.trim()) content += `\n\n# Google AI (Gemini)\nGOOGLE_AI_KEY="${googleAiKey.trim()}"`;
  if (openaiKey.trim()) content += `\n\n# OpenAI (ChatGPT + DALL-E image generation)\nOPENAI_KEY="${openaiKey.trim()}"`;
  if (groqKey.trim()) content += `\n\n# Groq (ultra-fast free inference)\nGROQ_KEY="${groqKey.trim()}"`;
  if (googleClientId.trim()) {
    content += `\n\n# Google OAuth (Calendar + Classroom)\nGOOGLE_CLIENT_ID="${googleClientId.trim()}"`;
    if (googleClientSecret.trim()) content += `\nGOOGLE_CLIENT_SECRET="${googleClientSecret.trim()}"`;
  }

  fs.writeFileSync(".env", content);
  fs.writeFileSync(".env.local", content);
  rl.close();

  console.log("\n✅ .env and .env.local created!\n");
  console.log("Next steps:");
  console.log("  npm install");
  console.log("  npm run db:push");
  console.log("  npm run dev");
  console.log("\nThen open: http://localhost:3000");
  console.log("Register with your admin email to get instant access.\n");

  if (googleClientId.trim()) {
    console.log("📅 Google Calendar/Classroom setup:");
    console.log(`  Add this redirect URI in Google Cloud Console:`);
    console.log(`  ${appUrl.trim()}/api/google/callback\n`);
  }
}

main().catch((e) => { console.error(e); rl.close(); process.exit(1); });
