"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { STUDY_MODES } from "@/lib/models";

type Assignment = { id: string; title: string; dueDate: string | null; maxPoints?: number };
type Course = { id: string; name: string; section?: string; assignments: Assignment[] };
type CalEvent = { id: string; title: string; start: string; end: string; location?: string; allDay: boolean };

function formatDate(iso: string | null) {
  if (!iso) return "No due date";
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 0) return `Overdue (${d.toLocaleDateString()})`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 7) return `Due in ${days} days`;
  return `Due ${d.toLocaleDateString()}`;
}

function dueColor(iso: string | null) {
  if (!iso) return "text-text-dim";
  const diff = new Date(iso).getTime() - Date.now();
  const days = diff / 86400000;
  if (days < 0) return "text-rose-DEFAULT";
  if (days < 2) return "text-amber-DEFAULT";
  if (days < 7) return "text-amber-DEFAULT/70";
  return "text-emerald-DEFAULT";
}

function formatEventTime(iso: string, allDay: boolean) {
  if (allDay) return new Date(iso).toLocaleDateString();
  return new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function StudyDashboard({ userName }: { userName: string }) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<"classroom" | "calendar" | "tools">("classroom");

  useEffect(() => {
    fetch("/api/google/status").then((r) => r.json()).then((d) => {
      setGoogleConnected(d.connected);
      setGoogleEmail(d.email);
      if (d.connected) { loadCourses(); loadEvents(); }
    });
  }, []);

  async function loadCourses() {
    setLoadingCourses(true);
    try {
      const res = await fetch("/api/google/classroom");
      if (res.ok) { const d = await res.json(); setCourses(d.courses ?? []); }
    } finally { setLoadingCourses(false); }
  }

  async function loadEvents() {
    setLoadingEvents(true);
    try {
      const res = await fetch("/api/google/calendar?days=14");
      if (res.ok) { const d = await res.json(); setEvents(d.events ?? []); }
    } finally { setLoadingEvents(false); }
  }

  async function startStudyChat(prompt: string, modeId: string) {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gemini-2.5-flash", provider: "GOOGLE" }),
    });
    if (res.ok) {
      const d = await res.json();
      // Store study mode in sessionStorage so ChatWindow picks it up
      sessionStorage.setItem(`studyMode_${d.conversation.id}`, modeId);
      sessionStorage.setItem(`firstMessage_${d.conversation.id}`, prompt);
      router.push(`/chat/${d.conversation.id}`);
    }
  }

  async function startAssignmentChat(assignment: Assignment, course: Course) {
    const prompt = `I need help with my assignment "${assignment.title}" from ${course.name}. ${assignment.dueDate ? `It's due ${formatDate(assignment.dueDate)}.` : ""} Can you help me understand what I need to do and guide me through it?`;
    await startStudyChat(prompt, "tutor");
  }

  const allAssignments = courses.flatMap((c) => c.assignments.map((a) => ({ ...a, courseName: c.name, courseId: c.id }))).sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const upcomingEvents = events.filter((e) => new Date(e.start) > new Date()).slice(0, 8);
  const todayEvents = events.filter((e) => {
    const d = new Date(e.start);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text">Study Tools</h1>
          <p className="mt-1 text-text-muted">Your AI-powered study assistant, Google Classroom, and Calendar — all in one place.</p>
        </div>

        {/* Google Connect Banner */}
        {!googleConnected && (
          <div className="mb-6 bg-accent/10 border border-accent/30 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Connect Google to unlock everything</p>
              <p className="text-sm text-text-muted mt-1">See your Google Classroom assignments, upcoming calendar events, and let Jarvis automatically reference them when you chat.</p>
            </div>
            <a href="/api/google/auth" className="shrink-0 ml-4 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition">Connect Google</a>
          </div>
        )}

        {googleConnected && (
          <div className="mb-6 flex items-center gap-2 text-sm text-emerald-DEFAULT">
            <span></span>
            <span>Connected as {googleEmail}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface-card border border-surface-border rounded-xl p-1 w-fit">
          {[
            { id: "classroom", label: " Classroom" },
            { id: "calendar", label: " Calendar" },
            { id: "tools", label: " Study tools" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.id ? "bg-accent/20 text-accent-hover" : "text-text-muted hover:text-text"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Classroom Tab */}
        {activeTab === "classroom" && (
          <div>
            {!googleConnected ? (
              <div className="text-center py-12 text-text-muted">
                <div className="text-4xl mb-3"></div>
                <p>Connect Google to see your assignments</p>
              </div>
            ) : loadingCourses ? (
              <div className="text-center py-12 text-text-dim">Loading courses…</div>
            ) : (
              <div className="space-y-6">
                {/* Upcoming assignments summary */}
                {allAssignments.length > 0 && (
                  <div>
                    <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Upcoming assignments</h2>
                    <div className="grid gap-3">
                      {allAssignments.slice(0, 6).map((a) => (
                        <div key={`${a.courseId}-${a.id}`} className="bg-surface-card border border-surface-border rounded-xl p-4 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text truncate">{a.title}</p>
                            <p className="text-xs text-text-dim mt-0.5">{a.courseName}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs font-medium ${dueColor(a.dueDate)}`}>{formatDate(a.dueDate)}</span>
                            <button
                              onClick={() => startAssignmentChat(a, courses.find((c) => c.id === a.courseId)!)}
                              className="px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent-hover rounded-lg text-xs font-medium transition"
                            >
                              Get help
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Courses */}
                <div>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Your courses</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {courses.map((course) => (
                      <div key={course.id} className="bg-surface-card border border-surface-border rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-text">{course.name}</p>
                            {course.section && <p className="text-xs text-text-dim mt-0.5">{course.section}</p>}
                          </div>
                          <span className="text-xs text-text-dim bg-surface-raised px-2 py-1 rounded">{course.assignments.length} tasks</span>
                        </div>
                        {course.assignments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {course.assignments.slice(0, 3).map((a) => (
                              <div key={a.id} className="flex items-center justify-between">
                                <p className="text-xs text-text-muted truncate mr-2">{a.title}</p>
                                <span className={`text-xs shrink-0 ${dueColor(a.dueDate)}`}>{formatDate(a.dueDate)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => startStudyChat(`I need help with ${course.name}. What topics should I focus on and how should I study?`, "tutor")}
                          className="mt-3 w-full py-1.5 border border-surface-border hover:border-accent/40 text-text-muted hover:text-text rounded-lg text-xs transition"
                        >
                          Study this course →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {courses.length === 0 && !loadingCourses && (
                  <div className="text-center py-8 text-text-muted">
                    <div className="text-3xl mb-2"></div>
                    <p>No active courses found in Google Classroom</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <div>
            {!googleConnected ? (
              <div className="text-center py-12 text-text-muted">
                <div className="text-4xl mb-3"></div>
                <p>Connect Google to see your calendar</p>
              </div>
            ) : loadingEvents ? (
              <div className="text-center py-12 text-text-dim">Loading events…</div>
            ) : (
              <div className="space-y-4">
                {todayEvents.length > 0 && (
                  <div>
                    <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Today</h2>
                    <div className="space-y-2">
                      {todayEvents.map((e) => (
                        <div key={e.id} className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-text">{e.title}</p>
                            {e.location && <p className="text-xs text-text-dim mt-0.5"> {e.location}</p>}
                          </div>
                          <span className="text-xs text-accent-hover shrink-0 ml-4">{formatEventTime(e.start, e.allDay)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Upcoming (next 14 days)</h2>
                  {upcomingEvents.length === 0 ? (
                    <p className="text-text-dim text-sm">No upcoming events.</p>
                  ) : (
                    <div className="space-y-2">
                      {upcomingEvents.map((e) => (
                        <div key={e.id} className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-text">{e.title}</p>
                            {e.location && <p className="text-xs text-text-dim mt-0.5"> {e.location}</p>}
                          </div>
                          <span className="text-xs text-text-muted shrink-0 ml-4">{formatEventTime(e.start, e.allDay)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Study Tools Tab */}
        {activeTab === "tools" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Quick start a session</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {STUDY_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => startStudyChat(`Let's start a ${mode.label.replace(/^[^ ]+ /, "")} session. I'm ready to learn!`, mode.id)}
                    className="bg-surface-card border border-surface-border rounded-xl p-4 text-left hover:border-accent/40 hover:bg-surface-hover transition group"
                  >
                    <div className="text-2xl mb-2">{mode.label.split(" ")[0]}</div>
                    <p className="font-medium text-text text-sm">{mode.label.split(" ").slice(1).join(" ")}</p>
                    <p className="text-xs text-text-dim mt-1 line-clamp-2">{mode.prompt.slice(0, 80)}…</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Study prompts</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: "Create a study schedule", prompt: "Help me create a realistic study schedule for this week. Ask me about my subjects and available time.", mode: "study-plan" },
                  { label: "Quiz me on any topic", prompt: "Quiz me on a topic of my choice. Start by asking what I want to be quizzed on.", mode: "quiz" },
                  { label: "Make flashcards", prompt: "I want to create flashcards. Ask me what subject/topic I'm studying.", mode: "flashcards" },
                  { label: "Essay brainstorm", prompt: "Help me brainstorm ideas for an essay. Ask me about the topic and requirements.", mode: "essay" },
                  { label: "Explain a concept", prompt: "I have something I need explained. Ask me what concept I'm struggling with.", mode: "explain" },
                  { label: "Check my homework", prompt: "I want you to check my homework. Ask me to paste or describe my answers.", mode: "tutor" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => startStudyChat(item.prompt, item.mode)}
                    className="text-left px-4 py-3 bg-surface-card border border-surface-border rounded-xl text-sm text-text-muted hover:text-text hover:border-accent/40 transition"
                  >
                    {item.label} →
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
