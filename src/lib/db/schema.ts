import {
  pgTable, text, timestamp, boolean, jsonb, integer,
  pgEnum, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";

function cuid() { return randomUUID(); }

//  Enums 
export const accountStatusEnum = pgEnum("account_status", ["PENDING", "APPROVED", "REJECTED"]);
export const roleEnum = pgEnum("role", ["USER", "ADMIN"]);
export const providerEnum = pgEnum("provider", ["OPENAI", "ANTHROPIC", "GOOGLE", "GROQ", "CUSTOM"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const messageTypeEnum = pgEnum("message_type", ["text", "image", "error"]);

//  Users 
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(cuid),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("USER"),
  status: accountStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

//  API Keys 
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey().$defaultFn(cuid),
  provider: providerEnum("provider").notNull(),
  label: text("label").notNull(),
  baseUrl: text("base_url"),
  encryptedKey: text("encrypted_key").notNull(),
  last4: text("last4").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => ({ upl: uniqueIndex("api_keys_upl").on(t.userId, t.provider, t.label) }));

//  Conversations 
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey().$defaultFn(cuid),
  title: text("title").notNull().default("New chat"),
  model: text("model").notNull().default("gemini-2.5-flash"),
  provider: providerEnum("provider").notNull().default("GOOGLE"),
  apiKeyId: text("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => ({ userIdx: index("conv_user_idx").on(t.userId) }));

//  Messages 
export type MessageContent =
  | { type: "text"; text: string }
  | { type: "image"; url: string; prompt: string; revised?: string }
  | { type: "error"; text: string };

export const messages = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(cuid),
  role: messageRoleEnum("role").notNull(),
  content: jsonb("content").notNull().$type<MessageContent>(),
  tokens: integer("tokens"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
}, (t) => ({ convIdx: index("msg_conv_idx").on(t.conversationId) }));

//  Google Tokens 
export const googleTokens = pgTable("google_tokens", {
  id: text("id").primaryKey().$defaultFn(cuid),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at").notNull(),
  email: text("email"),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
});

//  Study Notes 
export const studyNotes = pgTable("study_notes", {
  id: text("id").primaryKey().$defaultFn(cuid),
  title: text("title").notNull(),
  content: text("content").notNull(),
  courseId: text("course_id"),        // Google Classroom course ID
  courseName: text("course_name"),
  assignmentId: text("assignment_id"), // Google Classroom assignment ID
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => ({ userIdx: index("notes_user_idx").on(t.userId) }));


export const passwordResets = pgTable("password_resets", {
  id: text("id").primaryKey().$defaultFn(cuid),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userChoices = pgTable("user_choices", {
  id: text("id").primaryKey().$defaultFn(cuid),
  chosenProvider: text("chosen_provider").notNull(),
  chosenModel: text("chosen_model").notNull(),
  rejectedProvider: text("rejected_provider"),
  rejectedModel: text("rejected_model"),
  prompt: text("prompt").notNull(),
  conversationId: text("conversation_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => ({ userIdx: index("choices_user_idx").on(t.userId) }));

export const userPreferences = pgTable("user_preferences", {
  id: text("id").primaryKey().$defaultFn(cuid),
  judgeProvider: text("judge_provider").notNull().default("GOOGLE"),
  judgeModel: text("judge_model").notNull().default("gemini-2.5-flash"),
  preferenceProfile: text("preference_profile"),
  totalChoices: text("total_choices").notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
});
