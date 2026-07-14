// @ts-nocheck
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireApprovedUser } from "@/lib/api-guards";
import { getValidAccessToken, fetchClassroomCourses, fetchClassroomAssignments } from "@/lib/google-oauth";
export async function GET(req: NextRequest) {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  const token = await getValidAccessToken(user!.id);
  if (!token) return NextResponse.json({ error: "Google not connected." }, { status: 401 });
  const courseId = new URL(req.url).searchParams.get("courseId");
  if (courseId) {
    const assignments = await fetchClassroomAssignments(token, courseId);
    if (!assignments) return NextResponse.json({ error: "Failed." }, { status: 500 });
    return NextResponse.json({ assignments: assignments.map((a) => ({ id: a.id, title: a.title, description: a.description, dueDate: a.dueDate ? new Date(a.dueDate.year, a.dueDate.month - 1, a.dueDate.day, a.dueTime?.hours ?? 23, a.dueTime?.minutes ?? 59).toISOString() : null, maxPoints: a.maxPoints, state: a.state })) });
  }
  const courses = await fetchClassroomCourses(token);
  if (!courses) return NextResponse.json({ error: "Failed." }, { status: 500 });
  const result = await Promise.all(courses.slice(0, 8).map(async (c) => {
    const asgn = await fetchClassroomAssignments(token, c.id).catch(() => null);
    return { id: c.id, name: c.name, section: c.section, assignments: (asgn ?? []).filter((a) => a.state === "PUBLISHED").slice(0, 5).map((a) => ({ id: a.id, title: a.title, dueDate: a.dueDate ? new Date(a.dueDate.year, a.dueDate.month - 1, a.dueDate.day).toISOString() : null, maxPoints: a.maxPoints })) };
  }));
  return NextResponse.json({ courses: result });
}
