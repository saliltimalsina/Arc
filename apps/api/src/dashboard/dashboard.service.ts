import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const INITIALS = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("") || "?";

const COLORS = ["#F97316", "#9353D3", "#338EF7", "#17C964", "#F31260", "#F5A524", "#06B7DB", "#FF4ECD"];
const colorFor = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
};

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const projectIds = await this.accessibleProjectIds(userId);
    const [hero, timeline, workload, team, activeFocus, journey, snapshots] = await Promise.all([
      this.hero(userId, projectIds),
      this.timeline(userId, projectIds),
      this.workload(userId),
      this.team(userId, projectIds),
      this.activeFocus(userId, projectIds),
      this.journey(userId),
      this.snapshots(userId, projectIds),
    ]);
    return { hero, timeline, workload, team, activeFocus, journey, snapshots };
  }

  private async accessibleProjectIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.project.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      select: { id: true },
    });
    return rows.map(r => r.id);
  }

  // ── Hero ────────────────────────────────────────────────────────────────────
  private async hero(userId: string, _projectIds: string[]) {
    const today = startOfDay(new Date());
    const weekStart = addDays(today, -7);
    const lastWeekStart = addDays(today, -14);

    const [completedThisWeek, completedLastWeek, blockers, soonestSprint, totalCompleted] = await Promise.all([
      this.prisma.item.count({
        where: { assignees: { some: { userId } }, status: "Done", completedAt: { gte: weekStart } },
      }),
      this.prisma.item.count({
        where: { assignees: { some: { userId } }, status: "Done", completedAt: { gte: lastWeekStart, lt: weekStart } },
      }),
      this.prisma.item.count({
        where: {
          assignees: { some: { userId } },
          OR: [
            { status: { in: ["Blocked", "blocked"] } },
            { dueDate: { lt: today }, status: { notIn: ["Done", "done"] } },
          ],
        },
      }),
      this.prisma.sprint.findFirst({
        where: {
          status: "active",
          endDate: { gte: today },
          project: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
        },
        orderBy: { endDate: "asc" },
        select: { id: true, name: true, endDate: true, project: { select: { name: true } } },
      }),
      this.prisma.item.count({
        where: { assignees: { some: { userId } }, status: "Done" },
      }),
    ]);

    const momentumPct = completedLastWeek > 0
      ? Math.round(((completedThisWeek - completedLastWeek) / completedLastWeek) * 100)
      : completedThisWeek > 0 ? 100 : 0;

    const hoursToSprintEnd = soonestSprint?.endDate
      ? Math.max(0, Math.round((+new Date(soonestSprint.endDate) - Date.now()) / 36e5))
      : null;

    let state: "normal" | "deadline" | "achievement" = "normal";
    if (hoursToSprintEnd !== null && hoursToSprintEnd <= 48 && blockers > 0) state = "deadline";
    else if (totalCompleted > 0 && totalCompleted % 100 === 0) state = "achievement";

    const headline =
      state === "deadline"
        ? `Mission Control — ${soonestSprint?.project.name ?? "Sprint"} ships in ${hoursToSprintEnd}h. ${blockers} blocker${blockers === 1 ? "" : "s"} need you.`
        : state === "achievement"
        ? `You closed your ${totalCompleted}th task — momentum is at an all-time high.`
        : `Today, you have ${completedThisWeek === 0 ? "fresh ground" : `${completedThisWeek} wins this week`} and ${blockers} blocker${blockers === 1 ? "" : "s"}.`;

    const sub =
      state === "deadline"
        ? `Active sprint ${soonestSprint?.name ?? ""} ends in ${hoursToSprintEnd}h. Clear blockers first.`
        : state === "achievement"
        ? `Three teammates worked alongside you this week. The team is shipping faster, calmer, together.`
        : `Sprint health is ${blockers === 0 ? "good" : "tight"}. You're tracking at a ${Math.max(0, 70 + momentumPct)}% velocity week.`;

    const tag =
      state === "deadline" ? "Deadline focus" :
      state === "achievement" ? "Milestone unlocked" :
      "Normal day";

    return { state, headline, sub, tag, focusMinutes: 0, momentumPct, blockers, completedThisWeek };
  }

  // ── Timeline ────────────────────────────────────────────────────────────────
  private async timeline(userId: string, sharedProjectIds: string[]) {
    const today = startOfDay(new Date());
    const start = addDays(today, -25);

    const completed = await this.prisma.item.findMany({
      where: { assignees: { some: { userId } }, status: "Done", completedAt: { gte: start } },
      select: { completedAt: true },
    });

    const days = Array.from({ length: 26 }, (_, i) => {
      const dayStart = addDays(start, i);
      const dayEnd = addDays(dayStart, 1);
      return completed.filter(c => c.completedAt && c.completedAt >= dayStart && c.completedAt < dayEnd).length;
    });

    const projectIds = sharedProjectIds;

    const [recentDone, recentSprints, recentComments] = await Promise.all([
      this.prisma.item.findMany({
        where: { projectId: { in: projectIds }, status: "Done" },
        orderBy: { updatedAt: "desc" }, take: 3,
        select: { id: true, title: true, updatedAt: true, project: { select: { name: true } } },
      }),
      this.prisma.sprint.findMany({
        where: { projectId: { in: projectIds }, status: "completed" },
        orderBy: { updatedAt: "desc" }, take: 2,
        select: { id: true, name: true, updatedAt: true, project: { select: { name: true } } },
      }),
      this.prisma.comment.findMany({
        where: { item: { projectId: { in: projectIds } }, authorId: { not: userId } },
        orderBy: { createdAt: "desc" }, take: 2,
        select: { id: true, body: true, createdAt: true, author: { select: { name: true } }, item: { select: { title: true } } },
      }),
    ]);

    const events = [
      ...recentDone.map(i => ({
        kind: "complete" as const,
        text: `Closed ${i.title} in ${i.project.name}.`,
        at: i.updatedAt,
      })),
      ...recentSprints.map(s => ({
        kind: "milestone" as const,
        text: `Completed sprint ${s.name} in ${s.project.name}.`,
        at: s.updatedAt,
      })),
      ...recentComments.map(c => ({
        kind: "recognition" as const,
        text: `${c.author.name} commented on ${c.item.title}.`,
        at: c.createdAt,
      })),
    ]
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, 5)
      .map(e => ({ kind: e.kind, text: e.text, time: relTime(new Date(e.at)) }));

    return { days, events };
  }

  // ── Workload ────────────────────────────────────────────────────────────────
  private async workload(userId: string, _projectIds: string[] = []) {
    const today = startOfDay(new Date());
    const monday = addDays(today, -((today.getDay() + 6) % 7));  // monday of this week
    const rangeStart = addDays(monday, -3 * 7);
    const rangeEnd   = addDays(monday,  5 * 7);

    const items = await this.prisma.item.findMany({
      where: {
        assignees: { some: { userId } },
        dueDate: { gte: rangeStart, lt: rangeEnd },
        status: { notIn: ["Done", "done"] },
      },
      select: { dueDate: true, points: true },
    });

    const rows: string[][] = Array.from({ length: 5 }, () => Array(8).fill(""));
    for (const it of items) {
      if (!it.dueDate) continue;
      const day = new Date(it.dueDate);
      const weekIdx = Math.floor((+day - +rangeStart) / (7 * 86_400_000));
      if (weekIdx < 0 || weekIdx > 7) continue;
      const dow = (day.getDay() + 6) % 7;
      if (dow > 4) continue;
      rows[dow][weekIdx] = (rows[dow][weekIdx] ? rows[dow][weekIdx] + "+" : "") + (it.points ?? 1);
    }

    const matrix = rows.map(row => row.map(cell => {
      const sum = cell.split("+").filter(Boolean).reduce((a, b) => a + Number(b || 1), 0);
      if (sum === 0) return "bal-l";
      if (sum <= 2) return "bal";
      if (sum <= 4) return "amb";
      return "over";
    }));

    return { rows: matrix };
  }

  // ── Team ────────────────────────────────────────────────────────────────────
  private async team(userId: string, sharedProjectIds: string[]) {
    const projectIds = sharedProjectIds;

    const peers = await this.prisma.projectMember.findMany({
      where: { projectId: { in: projectIds }, userId: { not: userId } },
      select: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true } },
      },
      take: 12,
    });

    const dedup = new Map<string, { id: string; name: string }>();
    for (const p of peers) if (!dedup.has(p.user.id)) dedup.set(p.user.id, p.user);

    const today = startOfDay(new Date());
    const recentActivity = await this.prisma.comment.findMany({
      where: { authorId: { in: [...dedup.keys()] }, createdAt: { gte: addDays(today, -1) } },
      select: { authorId: true, createdAt: true },
    });
    const lastActive = new Map<string, Date>();
    for (const r of recentActivity) {
      const prev = lastActive.get(r.authorId);
      if (!prev || prev < r.createdAt) lastActive.set(r.authorId, r.createdAt);
    }

    return [...dedup.values()].slice(0, 6).map(u => {
      const last = lastActive.get(u.id);
      const minsSince = last ? Math.round((Date.now() - +last) / 60_000) : null;
      const status = minsSince === null ? "" : minsSince < 30 ? "active" : minsSince < 240 ? "busy" : "";
      const statusText = minsSince === null ? "Off today" :
                        minsSince < 30 ? "Recently active" :
                        minsSince < 240 ? `Active ${Math.round(minsSince / 60)}h ago` :
                        "Off today";
      return {
        name: u.name,
        initials: INITIALS(u.name),
        color: colorFor(u.id),
        status,
        statusText,
      };
    });
  }

  // ── Active Focus ────────────────────────────────────────────────────────────
  private async activeFocus(userId: string, _projectIds: string[]) {
    const top = await this.prisma.project.findFirst({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }], status: "active" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, emoji: true },
    });
    return top ? { projectId: top.id, projectName: `${top.emoji} ${top.name}` } : null;
  }

  // ── Journey Pulse ───────────────────────────────────────────────────────────
  private async journey(userId: string) {
    const today = startOfDay(new Date());
    const ranges = {
      week:  { days: 14, bucket: 1 },
      month: { days: 32, bucket: 2 },
      year:  { days: 360, bucket: 20 },
    };
    const completed = await this.prisma.item.findMany({
      where: { assignees: { some: { userId } }, status: "Done", completedAt: { gte: addDays(today, -360) } },
      select: { completedAt: true },
    });

    const series = (cfg: { days: number; bucket: number }) => {
      const buckets = Math.ceil(cfg.days / cfg.bucket);
      const arr = Array(buckets).fill(0);
      const start = addDays(today, -cfg.days);
      for (const c of completed) {
        if (!c.completedAt || c.completedAt < start) continue;
        const idx = Math.min(buckets - 1, Math.floor((+c.completedAt - +start) / (cfg.bucket * 86_400_000)));
        arr[idx]++;
      }
      return arr.map(v => v || 1);
    };

    return { week: series(ranges.week), month: series(ranges.month), year: series(ranges.year) };
  }

  // ── Snapshots ───────────────────────────────────────────────────────────────
  private async snapshots(userId: string, _sharedProjectIds: string[]) {
    const projects = await this.prisma.project.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }], status: "active" },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true, name: true, emoji: true, color: true, key: true,
        members: { take: 3, select: { user: { select: { id: true, name: true } } } },
        sprints: { where: { status: "active" }, orderBy: { endDate: "asc" }, take: 1, select: { endDate: true } },
      },
    });

    if (projects.length === 0) return [];

    const ids = projects.map(p => p.id);
    const counts = await this.prisma.item.groupBy({
      by: ["projectId", "status"],
      where: { projectId: { in: ids } },
      _count: { _all: true },
    });

    const aggMap = new Map<string, { total: number; done: number; blockers: number }>();
    for (const c of counts) {
      const a = aggMap.get(c.projectId) ?? { total: 0, done: 0, blockers: 0 };
      a.total += c._count._all;
      if (c.status === "Done" || c.status === "done") a.done += c._count._all;
      if (c.status === "Blocked" || c.status === "blocked") a.blockers += c._count._all;
      aggMap.set(c.projectId, a);
    }

    const today = startOfDay(new Date());
    return projects.map(p => {
      const agg = aggMap.get(p.id) ?? { total: 0, done: 0, blockers: 0 };
      const pct = agg.total > 0 ? Math.round((agg.done / agg.total) * 100) : 0;
      const sprintEnd = p.sprints[0]?.endDate;
      const daysToSprint = sprintEnd ? Math.max(0, Math.round((+sprintEnd - +today) / 86_400_000)) : null;
      const due = daysToSprint !== null ? `Due in ${daysToSprint} day${daysToSprint === 1 ? "" : "s"}` : "No active sprint";
      const health: "good" | "warn" = agg.blockers > 0 || (daysToSprint !== null && daysToSprint < 3 && pct < 70) ? "warn" : "good";
      const budget = agg.blockers > 1 ? "On edge" : "Healthy";
      return {
        id: p.id,
        key: p.key ?? "",
        name: p.name,
        emoji: p.emoji,
        pct,
        due,
        health,
        budget,
        blockers: agg.blockers,
        avatars: p.members.map(m => ({ initials: INITIALS(m.user.name), color: colorFor(m.user.id) })),
      };
    });
  }
}

function relTime(d: Date) {
  const diff = Math.round((Date.now() - +d) / 60_000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  const days = Math.round(diff / 1440);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
