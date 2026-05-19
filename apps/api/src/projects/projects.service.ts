import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProjectDto, UpdateProjectDto, CreateMilestoneDto, UpdateMilestoneDto, CreateGoalDto, UpdateGoalDto, AddProjectMemberDto } from "./dto/project.dto";
import { CreateSprintDto, UpdateSprintDto, CompleteSprintDto } from "./dto/sprint.dto";
import { CreateItemDto, UpdateItemDto, CreateCommentDto } from "./dto/item.dto";
import { sanitizeRichText, extractMentionedUserIds } from "./sanitize";
import { ActivityService } from "../activity/activity.service";
import { NotificationsService } from "../notifications/notifications.service";
import { loadItemContext } from "./notification-context";

// Light item shape for list views: no description (HTML can be 50KB+ per row).
// Use ITEM_DETAIL_INCLUDE only for single-item endpoints where the body is needed.
const LIST_ITEM_SELECT = {
  id: true, number: true, projectId: true, sprintId: true, parentId: true, reporterId: true,
  title: true, type: true, status: true, priority: true, points: true,
  dueDate: true, position: true, completedAt: true, deletedAt: true,
  createdAt: true, updatedAt: true,
  assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
  reporter: { select: { id: true, name: true, email: true } },
  subtasks: {
    where: { deletedAt: null },
    orderBy: { position: "asc" as const },
    select: {
      id: true, number: true, projectId: true, sprintId: true, parentId: true, reporterId: true,
      title: true, type: true, status: true, priority: true, points: true,
      dueDate: true, position: true, completedAt: true, deletedAt: true,
      createdAt: true, updatedAt: true,
      assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
      reporter: { select: { id: true, name: true, email: true } },
    },
  },
} as const;

const ITEM_INCLUDE = {
  assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
  reporter: { select: { id: true, name: true, email: true } },
  subtasks: {
    where: { deletedAt: null },
    orderBy: { position: "asc" as const },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
      reporter: { select: { id: true, name: true, email: true } },
    },
  },
};

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
    private notifications: NotificationsService,
  ) {}

  // ── Projects ──────────────────────────────────────────────────────────────

  async listProjects(userId: string) {
    return this.prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        key: true,
        emoji: true,
        color: true,
        client: true,
        status: true,
        description: true,
        ownerId: true,
        createdAt: true,
      },
    });
  }

  private deriveProjectKey(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
    return words.slice(0, 4).map(w => w[0]).join("").toUpperCase();
  }

  private async resolveUniqueKey(workspaceId: string | null, baseKey: string): Promise<string> {
    const root = baseKey.toUpperCase().slice(0, 6) || "PROJ";
    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = attempt === 0 ? root : `${root.slice(0, 5)}${attempt}`;
      const clash = await this.prisma.project.findFirst({
        where: { workspaceId, key: candidate, deletedAt: null },
        select: { id: true },
      });
      if (!clash) return candidate;
    }
    // fallback: append random suffix
    return `${root.slice(0, 4)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
  }

  async createProject(userId: string, dto: CreateProjectDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { defaultWorkspaceId: true } });
    const workspaceId = user?.defaultWorkspaceId ?? null;
    const requestedKey = dto.key ? dto.key.toUpperCase().slice(0, 6) : this.deriveProjectKey(dto.name);
    const key = await this.resolveUniqueKey(workspaceId, requestedKey);

    const project = await this.prisma.project.create({
      data: {
        workspaceId,
        name: dto.name,
        key,
        emoji: dto.emoji ?? "🚀",
        color: dto.color ?? "#338EF7",
        client: dto.client ?? "Internal",
        description: dto.description ?? null,
        ownerId: userId,
        members: {
          create: { userId, role: "owner" },
        },
      },
    });

    await this.activity.record({
      actorId: userId,
      projectId: project.id,
      entityType: "project",
      entityId: project.id,
      kind: "project.created",
      payload: { name: project.name, key: project.key },
    });

    // Create a default backlog sprint
    await this.prisma.sprint.create({
      data: {
        projectId: project.id,
        name: "Sprint 1",
        status: "planned",
        position: 0,
      },
    });

    return project;
  }

  async getProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sprints: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
          include: {
            items: {
              where: { parentId: null, deletedAt: null },
              orderBy: { position: "asc" },
              take: 200,
              select: LIST_ITEM_SELECT,
            },
          },
        },
        items: {
          where: { sprintId: null, parentId: null, deletedAt: null },
          orderBy: { position: "asc" },
          take: 200,
          select: LIST_ITEM_SELECT,
        },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        milestones: { where: { deletedAt: null }, orderBy: { position: "asc" } },
        goals: { where: { deletedAt: null }, orderBy: { position: "asc" } },
      },
    });

    if (!project) throw new NotFoundException("Project not found");
    this.assertMember(project, userId);

    const recentlyClosed = await this.prisma.item.findMany({
      where: { projectId, status: "Done", deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        assignees: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    return { ...project, recentlyClosed };
  }

  async searchItems(userId: string, projectId: string, query: string) {
    await this.assertProjectMember(userId, projectId);
    const q = (query || "").trim();
    if (!q) return [];
    // Title matches in DB. Description is HTML — fetch a small candidate set then
    // filter in-memory after stripping tags so users don't match on "<strong>".
    const lower = q.toLowerCase();
    // Two-pass: title matches first (no description payload), description fallback only
    // if we haven't hit the limit yet.
    const titleHits = await this.prisma.item.findMany({
      where: { projectId, deletedAt: null, title: { contains: q, mode: "insensitive" } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true, number: true, title: true, type: true, status: true, priority: true, updatedAt: true,
      },
    });
    if (titleHits.length >= 20) return titleHits;

    const titleHitIds = new Set(titleHits.map(t => t.id));
    const descCandidates = await this.prisma.item.findMany({
      where: {
        projectId,
        deletedAt: null,
        id: { notIn: [...titleHitIds] },
        description: { contains: q, mode: "insensitive" },
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true, number: true, title: true, type: true, status: true, priority: true, updatedAt: true, description: true,
      },
    });
    const descMatches = descCandidates
      .filter(c => (c.description ?? "").replace(/<[^>]+>/g, " ").toLowerCase().includes(lower))
      .slice(0, 20 - titleHits.length)
      .map(({ description, ...rest }) => rest);

    return [...titleHits, ...descMatches];
  }

  async updateProject(userId: string, projectId: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException();
    this.assertOwner(project, userId);
    const updated = await this.prisma.project.update({ where: { id: projectId }, data: dto });
    await this.activity.record({
      actorId: userId,
      projectId: project.id,
      entityType: "project",
      entityId: project.id,
      kind: "project.updated",
      payload: { changes: Object.keys(dto) },
    });
    return updated;
  }

  async deleteProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException();
    this.assertOwner(project, userId);
    await this.prisma.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });
    await this.activity.record({
      actorId: userId,
      projectId: project.id,
      entityType: "project",
      entityId: project.id,
      kind: "project.deleted",
      payload: { name: project.name },
    });
  }

  async restoreProject(userId: string, projectId: string) {
    // Soft-delete middleware excludes deletedAt !== null on findUnique. Use deletedAt filter explicit.
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: { not: null } },
    });
    if (!project) throw new NotFoundException();
    this.assertOwner(project, userId);
    await this.prisma.project.update({ where: { id: projectId }, data: { deletedAt: null } });
    await this.activity.record({
      actorId: userId,
      projectId: project.id,
      entityType: "project",
      entityId: project.id,
      kind: "project.restored",
    });
    return { id: project.id, restored: true };
  }

  async listTrashedProjects(userId: string) {
    return this.prisma.project.findMany({
      where: {
        deletedAt: { not: null },
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true, name: true, emoji: true, color: true, key: true, deletedAt: true, ownerId: true,
      },
    });
  }

  async getMyActivity(userId: string, opts: { limit?: number } = {}) {
    const cap = Math.min(Math.max(opts.limit ?? 12, 1), 100);
    const memberships = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = memberships.map(m => m.projectId);
    if (projectIds.length === 0) return [];

    const [items, comments, sprints] = await Promise.all([
      this.prisma.item.findMany({
        where: { projectId: { in: projectIds }, parentId: null, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, title: true, type: true, status: true, createdAt: true,
          project: { select: { name: true, emoji: true } },
          assignees: {
            take: 1,
            include: { user: { select: { id: true, name: true } } },
          },
        },
      }),
      this.prisma.comment.findMany({
        where: { item: { projectId: { in: projectIds }, deletedAt: null }, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, body: true, createdAt: true,
          author: { select: { id: true, name: true } },
          item: { select: { id: true, title: true } },
        },
      }),
      this.prisma.sprint.findMany({
        where: { projectId: { in: projectIds }, status: { in: ["active", "completed"] }, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true, name: true, status: true, updatedAt: true,
          project: { select: { name: true, emoji: true } },
        },
      }),
    ]);

    return [
      ...items.map(i => ({
        type: "item_created" as const,
        id: `item-${i.id}`,
        title: i.title,
        itemType: i.type,
        status: i.status,
        actor: i.assignees[0]?.user.name ?? null,
        projectName: `${i.project.emoji} ${i.project.name}`,
        at: i.createdAt,
      })),
      ...comments.map(c => ({
        type: "comment" as const,
        id: `comment-${c.id}`,
        body: c.body.length > 80 ? c.body.slice(0, 80) + "…" : c.body,
        itemTitle: c.item.title,
        actor: c.author.name,
        projectName: null as string | null,
        at: c.createdAt,
      })),
      ...sprints.map(s => ({
        type: s.status === "active" ? ("sprint_started" as const) : ("sprint_completed" as const),
        id: `sprint-${s.id}`,
        name: s.name,
        actor: null as string | null,
        projectName: `${s.project.emoji} ${s.project.name}`,
        at: s.updatedAt,
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, cap);
  }

  async getProjectActivity(
    userId: string,
    projectId: string,
    opts: { limit?: number } = {},
  ) {
    await this.assertProjectMember(userId, projectId);
    const cap = Math.min(Math.max(opts.limit ?? 12, 1), 100);

    const [items, comments, sprints] = await Promise.all([
      this.prisma.item.findMany({
        where: { projectId, parentId: null, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, title: true, type: true, status: true, createdAt: true,
          assignees: {
            take: 1,
            include: { user: { select: { id: true, name: true } } },
          },
        },
      }),
      this.prisma.comment.findMany({
        where: { item: { projectId, deletedAt: null }, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, body: true, createdAt: true,
          author: { select: { id: true, name: true } },
          item: { select: { id: true, title: true } },
        },
      }),
      this.prisma.sprint.findMany({
        where: { projectId, status: { in: ["active", "completed"] }, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, name: true, status: true, updatedAt: true },
      }),
    ]);

    const events = [
      ...items.map(i => ({
        type: "item_created" as const,
        id: `item-${i.id}`,
        title: i.title,
        itemType: i.type,
        status: i.status,
        actor: i.assignees[0]?.user.name ?? null,
        projectName: null as string | null,
        at: i.createdAt,
      })),
      ...comments.map(c => ({
        type: "comment" as const,
        id: `comment-${c.id}`,
        body: c.body.length > 80 ? c.body.slice(0, 80) + "…" : c.body,
        itemTitle: c.item.title,
        actor: c.author.name,
        projectName: null as string | null,
        at: c.createdAt,
      })),
      ...sprints.map(s => ({
        type: s.status === "active" ? ("sprint_started" as const) : ("sprint_completed" as const),
        id: `sprint-${s.id}`,
        name: s.name,
        actor: null as string | null,
        projectName: null as string | null,
        at: s.updatedAt,
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, cap);

    return events;
  }

  // ── Sprints ───────────────────────────────────────────────────────────────

  async listSprints(userId: string, projectId: string) {
    await this.assertProjectMember(userId, projectId);
    return this.prisma.sprint.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { position: "asc" },
      take: 100,
      include: {
        items: {
          where: { parentId: null, deletedAt: null },
          orderBy: { position: "asc" },
          take: 200,
          select: LIST_ITEM_SELECT,
        },
      },
    });
  }

  async createSprint(userId: string, projectId: string, dto: CreateSprintDto) {
    await this.assertProjectMember(userId, projectId);
    const last = await this.prisma.sprint.findFirst({
      where: { projectId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    let name = dto.name;
    const existing = await this.prisma.sprint.findFirst({ where: { projectId, name }, select: { id: true } });
    if (existing) {
      const match = name.match(/^(.*?)(\s+(\d+))?$/);
      const base = match?.[1]?.trim() ?? name;
      let n = match?.[3] ? Number(match[3]) + 1 : 2;
      while (await this.prisma.sprint.findFirst({ where: { projectId, name: `${base} ${n}` }, select: { id: true } })) n++;
      name = `${base} ${n}`;
    }
    const sprint = await this.prisma.sprint.create({
      data: {
        projectId,
        name,
        goal: dto.goal,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        position: (last?.position ?? -1) + 1,
      },
    });
    await this.activity.record({
      actorId: userId,
      projectId,
      entityType: "sprint",
      entityId: sprint.id,
      kind: "sprint.created",
      payload: { name: sprint.name },
    });
    return sprint;
  }

  async updateSprint(
    userId: string,
    projectId: string,
    sprintId: string,
    dto: UpdateSprintDto,
  ) {
    await this.assertProjectMember(userId, projectId);
    const sprint = await this.prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint || sprint.projectId !== projectId) throw new NotFoundException();
    if (dto.status === "active") {
      const result = await this.prisma.$transaction([
        this.prisma.sprint.updateMany({
          where: { projectId, status: "active", id: { not: sprintId } },
          data: { status: "planned" },
        }),
        this.prisma.sprint.update({
          where: { id: sprintId },
          data: {
            ...dto,
            startDate: dto.startDate ? new Date(dto.startDate) : undefined,
            endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          },
        }),
      ]).then(([, updated]) => updated);
      if (sprint.status !== "active") {
        const [actor, project, members] = await Promise.all([
          this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatarUrl: true, avatarColor: true } }),
          this.prisma.project.findUnique({ where: { id: projectId }, select: { name: true, key: true } }),
          this.prisma.projectMember.findMany({ where: { projectId, NOT: { userId } }, select: { userId: true } }),
        ]);
        if (members.length > 0) {
          await this.notifications.createMany(
            members.map(m => ({
              recipientId: m.userId,
              kind: "sprint.started",
              entityType: "sprint",
              entityId: sprintId,
              payload: {
                actorId: userId,
                actorName: actor?.name ?? "",
                actorAvatarUrl: actor?.avatarUrl ?? null,
                actorAvatarColor: actor?.avatarColor ?? null,
                projectId,
                projectKey: project?.key ?? "",
                projectName: project?.name ?? "",
                title: result.name,
                sprintId,
              },
            })),
          );
        }
      }
      return result;
    }
    return this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async completeSprint(
    userId: string,
    projectId: string,
    sprintId: string,
    dto: CompleteSprintDto,
  ) {
    await this.assertProjectMember(userId, projectId);
    const sprint = await this.prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint || sprint.projectId !== projectId) throw new NotFoundException();

    // Move incomplete items to another sprint or backlog
    const incompleteItems = await this.prisma.item.findMany({
      where: { sprintId, status: { not: "Done" }, parentId: null },
    });

    if (incompleteItems.length > 0) {
      const parentIds = incompleteItems.map((i) => i.id);
      await this.prisma.item.updateMany({
        where: { id: { in: parentIds } },
        data: { sprintId: dto.moveToSprintId ?? null },
      });
      await this.prisma.item.updateMany({
        where: { parentId: { in: parentIds } },
        data: { sprintId: dto.moveToSprintId ?? null },
      });
    }

    // Mark sprint as completed — keep it visible for history.
    // Done items stay attached to the sprint so closeout reports work.
    await this.prisma.sprint.update({
      where: { id: sprintId },
      data: { status: "completed", endDate: new Date() },
    });
    await this.activity.record({
      actorId: userId,
      projectId,
      entityType: "sprint",
      entityId: sprintId,
      kind: "sprint.completed",
      payload: { name: sprint.name, movedItems: incompleteItems.length, movedToSprintId: dto.moveToSprintId ?? null },
    });

    const [actor, project, members] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatarUrl: true, avatarColor: true } }),
      this.prisma.project.findUnique({ where: { id: projectId }, select: { name: true, key: true } }),
      this.prisma.projectMember.findMany({ where: { projectId, NOT: { userId } }, select: { userId: true } }),
    ]);
    if (members.length > 0) {
      await this.notifications.createMany(
        members.map(m => ({
          recipientId: m.userId,
          kind: "sprint.completed",
          entityType: "sprint",
          entityId: sprintId,
          payload: {
            actorId: userId,
            actorName: actor?.name ?? "",
            actorAvatarUrl: actor?.avatarUrl ?? null,
            actorAvatarColor: actor?.avatarColor ?? null,
            projectId,
            projectKey: project?.key ?? "",
            projectName: project?.name ?? "",
            title: sprint.name,
            sprintId,
          },
        })),
      );
    }
    return { id: sprintId, status: "completed" };
  }

  async deleteSprint(userId: string, projectId: string, sprintId: string) {
    await this.assertProjectMember(userId, projectId);
    const sprint = await this.prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint || sprint.projectId !== projectId) throw new NotFoundException();
    // Move items to backlog before soft deleting sprint
    await this.prisma.item.updateMany({
      where: { sprintId },
      data: { sprintId: null },
    });
    await this.prisma.sprint.update({ where: { id: sprintId }, data: { deletedAt: new Date() } });
    await this.activity.record({
      actorId: userId,
      projectId,
      entityType: "sprint",
      entityId: sprintId,
      kind: "sprint.deleted",
      payload: { name: sprint.name },
    });
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  async getItem(userId: string, projectId: string, itemId: string) {
    await this.assertProjectMember(userId, projectId);
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, projectId, deletedAt: null },
      include: ITEM_INCLUDE,
    });
    if (!item) throw new NotFoundException();
    return item;
  }

  async listItems(
    userId: string,
    projectId: string,
    opts: { sprintId?: string; limit?: number; cursor?: string } = {},
  ) {
    await this.assertProjectMember(userId, projectId);
    const take = Math.min(Math.max(opts.limit ?? 50, 1), 100);
    const rows = await this.prisma.item.findMany({
      where: {
        projectId,
        parentId: null,
        sprintId: opts.sprintId === "backlog" ? null : (opts.sprintId ?? undefined),
        deletedAt: null,
      },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select: LIST_ITEM_SELECT,
    });
    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null };
  }

  async createItem(userId: string, projectId: string, dto: CreateItemDto) {
    await this.assertProjectMember(userId, projectId);
    let effectiveSprintId: string | null | undefined = dto.sprintId;
    if (effectiveSprintId === undefined && dto.parentId) {
      const parent = await this.prisma.item.findUnique({
        where: { id: dto.parentId },
        select: { sprintId: true, projectId: true },
      });
      if (parent && parent.projectId === projectId) effectiveSprintId = parent.sprintId;
    }

    const created = await this.prisma.$transaction(async tx => {
      const last = await tx.item.findFirst({
        where: { projectId, sprintId: effectiveSprintId ?? null, parentId: dto.parentId ?? null },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const project = await tx.project.update({
        where: { id: projectId },
        data: { itemCounter: { increment: 1 } },
        select: { itemCounter: true },
      });
      const isDone = (dto.status ?? "To Do") === "Done";
      return tx.item.create({
        data: {
          projectId,
          number: project.itemCounter,
          sprintId: effectiveSprintId ?? null,
          parentId: dto.parentId ?? null,
          reporterId: userId,
          title: dto.title,
          description: dto.description ? sanitizeRichText(dto.description) : dto.description,
          type: dto.type ?? "story",
          status: dto.status ?? "To Do",
          priority: dto.priority ?? "medium",
          points: dto.points,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          position: (last?.position ?? -1) + 1,
          completedAt: isDone ? new Date() : null,
        },
        include: ITEM_INCLUDE,
      });
    });
    await this.activity.record({
      actorId: userId,
      projectId,
      entityType: "item",
      entityId: created.id,
      kind: "item.created",
      payload: { number: created.number, title: created.title, type: created.type },
    });

    // If this is a subtask, notify parent's reporter + assignees
    if (created.parentId) {
      const parent = await this.prisma.item.findUnique({
        where: { id: created.parentId },
        select: {
          number: true, title: true, reporterId: true,
          assignees: { select: { userId: true } },
        },
      });
      if (parent) {
        const ctx = await loadItemContext(this.prisma, userId, created.id);
        const watchers = new Set<string>();
        if (parent.reporterId && parent.reporterId !== userId) watchers.add(parent.reporterId);
        for (const a of parent.assignees) if (a.userId !== userId) watchers.add(a.userId);
        if (watchers.size > 0) {
          await this.notifications.createMany(
            [...watchers].map(recipientId => ({
              recipientId,
              kind: "subtask.added",
              entityType: "item",
              entityId: created.id,
              payload: { ...ctx, parentItemNumber: parent.number, parentTitle: parent.title },
            })),
          );
        }
      }
    }

    return created;
  }

  async updateItem(
    userId: string,
    projectId: string,
    itemId: string,
    dto: UpdateItemDto,
  ) {
    await this.assertProjectMember(userId, projectId);
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.projectId !== projectId) throw new NotFoundException();
    if (dto.sprintId !== undefined && dto.sprintId !== null) {
      const sprint = await this.prisma.sprint.findUnique({ where: { id: dto.sprintId } });
      if (!sprint || sprint.projectId !== projectId)
        throw new BadRequestException("Sprint does not belong to this project");
    }

    let inheritedSprintId: string | null | undefined;
    let newParent: { id: string; number: number; title: string; sprintId: string | null; reporterId: string | null } | null = null;
    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === itemId) throw new BadRequestException("Item cannot parent itself");
      const parent = await this.prisma.item.findUnique({
        where: { id: dto.parentId },
        select: { id: true, projectId: true, parentId: true, number: true, title: true, sprintId: true, reporterId: true },
      });
      if (!parent || parent.projectId !== projectId) throw new BadRequestException("Parent item not in this project");
      // Cycle check via recursive CTE — single round-trip, no depth cap
      const cycle = await this.prisma.$queryRaw<{ id: string }[]>`
        WITH RECURSIVE ancestors AS (
          SELECT id, "parentId" FROM "Item" WHERE id = ${parent.id}
          UNION ALL
          SELECT i.id, i."parentId" FROM "Item" i JOIN ancestors a ON i.id = a."parentId"
        )
        SELECT id FROM ancestors WHERE id = ${itemId} LIMIT 1`;
      if (cycle.length > 0) throw new BadRequestException("Reparent would create a cycle");
      newParent = { id: parent.id, number: parent.number, title: parent.title, sprintId: parent.sprintId, reporterId: parent.reporterId };
      // Inherit parent's sprint when caller didn't explicitly pass one
      if (dto.sprintId === undefined && parent.sprintId !== item.sprintId) {
        inheritedSprintId = parent.sprintId;
      }
    }

    if (dto.reporterId !== undefined && dto.reporterId !== null) {
      const member = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: dto.reporterId } },
        select: { id: true },
      });
      if (!member) throw new BadRequestException("Reporter must be a project member");
    }

    const trackedFields: (keyof UpdateItemDto)[] = ["title", "description", "type", "status", "priority", "points", "dueDate", "sprintId", "reporterId", "parentId"];
    const activityLogs: { field: string; fromValue: string | null; toValue: string | null }[] = [];
    for (const f of trackedFields) {
      if (dto[f] === undefined) continue;
      const before = (item as any)[f];
      const after  = (dto as any)[f];
      const beforeStr = before instanceof Date ? before.toISOString() : before === null || before === undefined ? null : String(before);
      const afterStr  = after  instanceof Date ? after.toISOString()  : after  === null || after  === undefined ? null : String(after);
      if (beforeStr !== afterStr) {
        activityLogs.push({ field: f, fromValue: beforeStr, toValue: afterStr });
      }
    }

    const completedAtUpdate =
      dto.status === undefined
        ? undefined
        : dto.status === "Done" && item.status !== "Done"
          ? new Date()
          : dto.status !== "Done" && item.status === "Done"
            ? null
            : undefined;

    const updated = await this.prisma.item.update({
      where: { id: itemId },
      data: {
        ...dto,
        description: dto.description !== undefined
          ? (dto.description ? sanitizeRichText(dto.description) : dto.description)
          : undefined,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
        completedAt: completedAtUpdate,
        // If parent change implies a different sprint, follow the parent unless caller overrode it
        sprintId: inheritedSprintId !== undefined ? inheritedSprintId : dto.sprintId,
      },
      include: ITEM_INCLUDE,
    });

    if (activityLogs.length > 0) {
      await this.prisma.itemActivity.createMany({
        data: activityLogs.map(a => ({ itemId, userId, ...a })),
      });
      await this.activity.record({
        actorId: userId,
        projectId,
        entityType: "item",
        entityId: itemId,
        kind: "item.updated",
        payload: { changes: activityLogs.map(a => a.field) },
      });

      // Notify reporter + assignees on meaningful field changes
      const ctx = await loadItemContext(this.prisma, userId, itemId);
      const assignees = await this.prisma.itemAssignee.findMany({ where: { itemId }, select: { userId: true } });
      const watchers = new Set<string>();
      if (item.reporterId && item.reporterId !== userId) watchers.add(item.reporterId);
      for (const a of assignees) if (a.userId !== userId) watchers.add(a.userId);
      const watcherIds = [...watchers];

      const notifyKind = async (kind: string, fromValue: string | null, toValue: string | null, only?: Set<string>) => {
        const recipients = only ? watcherIds.filter(id => only.has(id)) : watcherIds;
        if (recipients.length === 0) return;
        await this.notifications.createMany(
          recipients.map(recipientId => ({
            recipientId,
            kind,
            entityType: "item",
            entityId: itemId,
            payload: { ...ctx, fromValue, toValue },
          })),
        );
      };

      const tasks: Promise<unknown>[] = [];
      for (const log of activityLogs) {
        if (log.field === "status") {
          tasks.push(notifyKind("item.status_changed", log.fromValue, log.toValue));
        } else if (log.field === "priority") {
          tasks.push(notifyKind("item.priority_changed", log.fromValue, log.toValue));
        } else if (log.field === "dueDate") {
          tasks.push(notifyKind("item.due_changed", log.fromValue, log.toValue));
        } else if (log.field === "reporterId" && log.toValue && log.toValue !== userId) {
          tasks.push(this.notifications.create({
            recipientId: log.toValue,
            kind: "item.reporter_changed",
            entityType: "item",
            entityId: itemId,
            payload: { ...ctx, fromValue: log.fromValue, toValue: log.toValue },
          }));
        }
      }
      if (tasks.length > 0) await Promise.all(tasks);
    }

    // Notify new parent's reporter+assignees if a reparent landed an item under them
    if (newParent && newParent.id !== item.parentId) {
      const parentAssignees = await this.prisma.itemAssignee.findMany({
        where: { itemId: newParent.id },
        select: { userId: true },
      });
      const ctx2 = await loadItemContext(this.prisma, userId, itemId);
      const recipients = new Set<string>();
      if (newParent.reporterId && newParent.reporterId !== userId) recipients.add(newParent.reporterId);
      for (const a of parentAssignees) if (a.userId !== userId) recipients.add(a.userId);
      if (recipients.size > 0) {
        await this.notifications.createMany(
          [...recipients].map(recipientId => ({
            recipientId,
            kind: "subtask.added",
            entityType: "item",
            entityId: itemId,
            payload: { ...ctx2, parentItemNumber: newParent!.number, parentTitle: newParent!.title },
          })),
        );
      }
    }

    return updated;
  }

  async listItemActivity(
    userId: string,
    projectId: string,
    itemId: string,
    opts: { limit?: number; cursor?: string } = {},
  ) {
    await this.assertProjectMember(userId, projectId);
    const take = Math.min(Math.max(opts.limit ?? 50, 1), 100);
    const rows = await this.prisma.itemActivity.findMany({
      where: { itemId },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null };
  }

  async setAssignee(userId: string, projectId: string, itemId: string, assigneeUserId: string | null) {
    await this.assertProjectMember(userId, projectId);
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.projectId !== projectId) throw new NotFoundException();
    if (assigneeUserId) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
      const member = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: assigneeUserId } },
        select: { id: true },
      });
      if (!member && project?.ownerId !== assigneeUserId) {
        throw new BadRequestException("Assignee must be a project member");
      }
    }
    // Read+delete+create atomically so parallel calls can't observe stale state
    const previous = await this.prisma.$transaction(async tx => {
      const prev = await tx.itemAssignee.findFirst({ where: { itemId } });
      await tx.itemAssignee.deleteMany({ where: { itemId } });
      if (assigneeUserId) {
        await tx.itemAssignee.create({ data: { itemId, userId: assigneeUserId } });
      }
      return prev;
    });
    const fromValue = previous?.userId ?? null;
    const toValue = assigneeUserId ?? null;
    if (fromValue !== toValue) {
      await this.prisma.itemActivity.create({
        data: { itemId, userId, field: "assignee", fromValue, toValue },
      });
      const ctx = await loadItemContext(this.prisma, userId, itemId);
      if (toValue && toValue !== userId) {
        await this.notifications.create({
          recipientId: toValue,
          kind: "item.assigned",
          entityType: "item",
          entityId: itemId,
          payload: ctx,
        });
      }
      if (fromValue && fromValue !== userId && fromValue !== toValue) {
        await this.notifications.create({
          recipientId: fromValue,
          kind: "item.unassigned",
          entityType: "item",
          entityId: itemId,
          payload: ctx,
        });
      }
      await this.activity.record({
        actorId: userId,
        projectId,
        entityType: "item",
        entityId: itemId,
        kind: "item.assigned",
        payload: { fromUserId: fromValue, toUserId: toValue, itemNumber: item.number },
      });
    }
    return this.prisma.item.findUnique({ where: { id: itemId }, include: ITEM_INCLUDE });
  }

  async deleteItem(userId: string, projectId: string, itemId: string) {
    await this.assertProjectMember(userId, projectId);
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      include: { assignees: { select: { userId: true } } },
    });
    if (!item || item.projectId !== projectId) throw new NotFoundException();
    const now = new Date();
    await this.prisma.item.updateMany({ where: { parentId: itemId, deletedAt: null }, data: { deletedAt: now } });
    await this.prisma.item.update({ where: { id: itemId }, data: { deletedAt: now } });
    await this.activity.record({
      actorId: userId,
      projectId,
      entityType: "item",
      entityId: itemId,
      kind: "item.deleted",
      payload: { number: item.number, title: item.title },
    });
    // Notify reporter + assignees (except actor)
    const watchers = new Set<string>();
    if (item.reporterId && item.reporterId !== userId) watchers.add(item.reporterId);
    for (const a of item.assignees) if (a.userId !== userId) watchers.add(a.userId);
    if (watchers.size > 0) {
      const ctx = await loadItemContext(this.prisma, userId, itemId);
      await this.notifications.createMany(
        [...watchers].map(recipientId => ({
          recipientId,
          kind: "item.deleted",
          entityType: "item",
          entityId: itemId,
          payload: ctx,
        })),
      );
    }
  }

  async restoreItem(userId: string, projectId: string, itemId: string) {
    await this.assertProjectMember(userId, projectId);
    const restored = await this.prisma.item.update({ where: { id: itemId }, data: { deletedAt: null } });
    await this.activity.record({
      actorId: userId,
      projectId,
      entityType: "item",
      entityId: itemId,
      kind: "item.restored",
      payload: { number: restored.number, title: restored.title },
    });
    const assignees = await this.prisma.itemAssignee.findMany({ where: { itemId }, select: { userId: true } });
    const watchers = new Set<string>();
    if (restored.reporterId && restored.reporterId !== userId) watchers.add(restored.reporterId);
    for (const a of assignees) if (a.userId !== userId) watchers.add(a.userId);
    if (watchers.size > 0) {
      const ctx = await loadItemContext(this.prisma, userId, itemId);
      await this.notifications.createMany(
        [...watchers].map(recipientId => ({
          recipientId,
          kind: "item.restored",
          entityType: "item",
          entityId: itemId,
          payload: ctx,
        })),
      );
    }
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async listComments(
    userId: string,
    projectId: string,
    itemId: string,
    opts: { limit?: number; cursor?: string } = {},
  ) {
    await this.assertProjectMember(userId, projectId);
    const take = Math.min(Math.max(opts.limit ?? 50, 1), 100);
    const rows = await this.prisma.comment.findMany({
      where: { itemId },
      orderBy: { createdAt: "asc" },
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null };
  }

  async createComment(
    userId: string,
    projectId: string,
    itemId: string,
    dto: CreateCommentDto,
  ) {
    await this.assertProjectMember(userId, projectId);
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      include: { assignees: { select: { userId: true } } },
    });
    if (!item || item.projectId !== projectId) throw new NotFoundException();

    const cleanBody = sanitizeRichText(dto.body);
    const comment = await this.prisma.comment.create({
      data: { itemId, authorId: userId, body: cleanBody },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    const ctx = await loadItemContext(this.prisma, userId, itemId);
    const ctxWithComment = { ...ctx, commentId: comment.id };

    // Mentions take priority — different notification kind
    const mentionedIds = extractMentionedUserIds(cleanBody).filter(id => id !== userId);
    let mentionedMembers: string[] = [];
    if (mentionedIds.length > 0) {
      const verifiedMembers = await this.prisma.projectMember.findMany({
        where: { projectId, userId: { in: mentionedIds } },
        select: { userId: true },
      });
      mentionedMembers = verifiedMembers.map(m => m.userId);
      if (mentionedMembers.length > 0) {
        await this.notifications.createMany(
          mentionedMembers.map(recipientId => ({
            recipientId,
            kind: "item.mentioned",
            entityType: "item",
            entityId: itemId,
            payload: ctxWithComment,
          })),
        );
      }
    }

    // Notify reporter + assignees (excluding comment author + already-mentioned)
    const mentionedSet = new Set(mentionedMembers);
    const recipientIds = new Set<string>();
    if (item.reporterId && item.reporterId !== userId && !mentionedSet.has(item.reporterId)) recipientIds.add(item.reporterId);
    for (const a of item.assignees) {
      if (a.userId !== userId && !mentionedSet.has(a.userId)) recipientIds.add(a.userId);
    }

    if (recipientIds.size > 0) {
      await this.notifications.createMany(
        Array.from(recipientIds).map(recipientId => ({
          recipientId,
          kind: "item.commented",
          entityType: "item",
          entityId: itemId,
          payload: ctxWithComment,
        })),
      );
    }

    return comment;
  }

  async deleteComment(userId: string, projectId: string, commentId: string) {
    await this.assertProjectMember(userId, projectId);
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException();
    if (comment.authorId !== userId) throw new ForbiddenException();
    await this.prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  }

  // ── Me ────────────────────────────────────────────────────────────────────

  async getMyItems(userId: string) {
    return this.prisma.itemAssignee.findMany({
      where: { userId, item: { deletedAt: null, project: { deletedAt: null } } },
      select: {
        id: true, itemId: true, userId: true,
        item: {
          select: {
            id: true, number: true, title: true, type: true, status: true, priority: true,
            dueDate: true, completedAt: true, sprintId: true, parentId: true, position: true,
            createdAt: true, updatedAt: true,
            project: { select: { id: true, name: true, emoji: true, color: true, key: true } },
            assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        },
      },
    });
  }

  async getMyStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const aliveItem = { deletedAt: null, project: { deletedAt: null } };
    const [activeProjects, openItems, inReview, completedItems, blockers] = await Promise.all([
      this.prisma.project.count({
        where: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
          status: "active",
          deletedAt: null,
        },
      }),
      this.prisma.itemAssignee.count({
        where: { userId, item: { ...aliveItem, status: { not: "Done" } } },
      }),
      this.prisma.itemAssignee.count({
        where: { userId, item: { ...aliveItem, status: "In Review" } },
      }),
      this.prisma.itemAssignee.count({
        where: { userId, item: { ...aliveItem, status: "Done" } },
      }),
      this.prisma.itemAssignee.count({
        where: {
          userId,
          item: {
            ...aliveItem,
            OR: [
              { status: { in: ["Blocked", "blocked"] } },
              { dueDate: { lt: today }, status: { notIn: ["Done", "done"] } },
            ],
          },
        },
      }),
    ]);
    return { activeProjects, openItems, inReview, completedItems, blockers };
  }

  // ── Project Members ───────────────────────────────────────────────────────

  async addProjectMember(userId: string, projectId: string, dto: AddProjectMemberDto) {
    await this.assertProjectMember(userId, projectId);
    const caller = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });
    if (!["owner", "admin"].includes(caller?.role ?? ""))
      throw new ForbiddenException("Only owner or admin can add members");

    const target = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      select: { id: true, name: true, email: true, emailVerified: true },
    });
    if (!target) throw new NotFoundException("User not registered");
    if (!target.emailVerified) throw new BadRequestException("User email not verified");

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: target.id } },
    });
    if (existing) throw new ConflictException("User already a project member");

    await this.prisma.projectMember.create({
      data: { projectId, userId: target.id, role: dto.role ?? "member" },
    });

    await this.activity.record({
      actorId: userId,
      projectId,
      entityType: "projectMember",
      entityId: target.id,
      kind: "member.added",
      payload: { targetEmail: target.email, role: dto.role ?? "member" },
    });

    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, avatarUrl: true, avatarColor: true },
    });
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, key: true, emoji: true },
    });
    await this.notifications.create({
      recipientId: target.id,
      kind: "project.invited",
      entityType: "project",
      entityId: projectId,
      payload: {
        actorId: userId,
        actorName: actor?.name ?? "",
        actorAvatarUrl: actor?.avatarUrl ?? null,
        actorAvatarColor: actor?.avatarColor ?? null,
        projectId,
        projectKey: project?.key ?? "",
        projectName: project?.name ?? "",
        title: project?.name ?? "",
        role: dto.role ?? "member",
      },
    });

    return this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
  }

  async removeProjectMember(userId: string, projectId: string, targetUserId: string) {
    await this.assertProjectMember(userId, projectId);
    const caller = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });
    if (!["owner", "admin"].includes(caller?.role ?? ""))
      throw new ForbiddenException("Only owner or admin can remove members");

    const target = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException("Member not found");
    if (target.role === "owner") throw new ForbiddenException("Cannot remove owner");

    await this.prisma.$transaction([
      this.prisma.itemAssignee.deleteMany({
        where: { userId: targetUserId, item: { projectId } },
      }),
      // Null out reporter on items they reported in this project — kicked users
      // shouldn't keep showing up as the responsible party in lists.
      this.prisma.item.updateMany({
        where: { projectId, reporterId: targetUserId },
        data: { reporterId: null },
      }),
      this.prisma.projectMember.delete({
        where: { projectId_userId: { projectId, userId: targetUserId } },
      }),
    ]);

    await this.activity.record({
      actorId: userId,
      projectId,
      entityType: "projectMember",
      entityId: targetUserId,
      kind: "member.removed",
      payload: { previousRole: target.role },
    });

    const [actor, project] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatarUrl: true, avatarColor: true } }),
      this.prisma.project.findUnique({ where: { id: projectId }, select: { name: true, key: true } }),
    ]);
    await this.notifications.create({
      recipientId: targetUserId,
      kind: "project.removed_from",
      entityType: "project",
      entityId: projectId,
      payload: {
        actorId: userId,
        actorName: actor?.name ?? "",
        actorAvatarUrl: actor?.avatarUrl ?? null,
        actorAvatarColor: actor?.avatarColor ?? null,
        projectId,
        projectKey: project?.key ?? "",
        projectName: project?.name ?? "",
        title: project?.name ?? "",
      },
    });
  }

  async updateProjectMemberRole(userId: string, projectId: string, targetUserId: string, role: string) {
    await this.assertProjectMember(userId, projectId);
    const allowed = ["owner", "admin", "member"];
    if (!allowed.includes(role)) throw new BadRequestException("Invalid role");

    const caller = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });
    if (caller?.role !== "owner") throw new ForbiddenException("Only owner can change roles");

    const target = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException("Member not found");

    if (role === "owner") {
      // No-op: target already owner — don't silently demote caller
      if (target.role === "owner") {
        return this.prisma.project.findUnique({
          where: { id: projectId },
          select: {
            members: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        });
      }
      await this.prisma.$transaction([
        this.prisma.projectMember.update({
          where: { projectId_userId: { projectId, userId } },
          data: { role: "admin" },
        }),
        this.prisma.projectMember.update({
          where: { projectId_userId: { projectId, userId: targetUserId } },
          data: { role: "owner" },
        }),
      ]);
    } else {
      // Guard: demoting current owner would orphan the project. Refuse unless another owner remains.
      if (target.role === "owner") {
        const ownerCount = await this.prisma.projectMember.count({
          where: { projectId, role: "owner" },
        });
        if (ownerCount <= 1) {
          throw new BadRequestException("Cannot demote the only owner. Transfer ownership first.");
        }
      }
      await this.prisma.projectMember.update({
        where: { projectId_userId: { projectId, userId: targetUserId } },
        data: { role },
      });
    }

    await this.activity.record({
      actorId: userId,
      projectId,
      entityType: "projectMember",
      entityId: targetUserId,
      kind: "member.role_changed",
      payload: { from: target.role, to: role },
    });

    if (targetUserId !== userId) {
      const [actor, project] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatarUrl: true, avatarColor: true } }),
        this.prisma.project.findUnique({ where: { id: projectId }, select: { name: true, key: true } }),
      ]);
      await this.notifications.create({
        recipientId: targetUserId,
        kind: "project.role_changed",
        entityType: "project",
        entityId: projectId,
        payload: {
          actorId: userId,
          actorName: actor?.name ?? "",
          actorAvatarUrl: actor?.avatarUrl ?? null,
          actorAvatarColor: actor?.avatarColor ?? null,
          projectId,
          projectKey: project?.key ?? "",
          projectName: project?.name ?? "",
          title: project?.name ?? "",
          fromValue: target.role,
          toValue: role,
        },
      });
    }

    return this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
  }

  // ── Milestones ────────────────────────────────────────────────────────────

  async createMilestone(userId: string, projectId: string, dto: CreateMilestoneDto) {
    await this.assertProjectMember(userId, projectId);
    const count = await this.prisma.milestone.count({ where: { projectId } });
    const m = await this.prisma.milestone.create({
      data: { projectId, name: dto.name, date: new Date(dto.date), position: dto.position ?? count },
    });
    await this.activity.record({
      actorId: userId,
      projectId,
      entityType: "milestone",
      entityId: m.id,
      kind: "milestone.created",
      payload: { name: m.name, date: m.date },
    });
    return m;
  }

  async updateMilestone(userId: string, projectId: string, milestoneId: string, dto: UpdateMilestoneDto) {
    await this.assertProjectMember(userId, projectId);
    const m = await this.prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!m || m.projectId !== projectId) throw new NotFoundException("Milestone not found");
    return this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
    });
  }

  async deleteMilestone(userId: string, projectId: string, milestoneId: string) {
    await this.assertProjectMember(userId, projectId);
    const m = await this.prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!m || m.projectId !== projectId) throw new NotFoundException("Milestone not found");
    await this.prisma.milestone.update({ where: { id: milestoneId }, data: { deletedAt: new Date() } });
  }

  // ── Goals ─────────────────────────────────────────────────────────────────

  async listGoals(userId: string, projectId: string) {
    await this.assertProjectMember(userId, projectId);
    return this.prisma.goal.findMany({ where: { projectId }, orderBy: { position: "asc" }, take: 200 });
  }

  async createGoal(userId: string, projectId: string, dto: CreateGoalDto) {
    await this.assertProjectMember(userId, projectId);
    const count = await this.prisma.goal.count({ where: { projectId } });
    const goal = await this.prisma.goal.create({
      data: {
        projectId,
        name: dto.name,
        emoji: dto.emoji ?? "🎯",
        color: dto.color ?? "#338EF7",
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        position: dto.position ?? count,
      },
    });
    await this.activity.record({
      actorId: userId,
      projectId,
      entityType: "goal",
      entityId: goal.id,
      kind: "goal.created",
      payload: { name: goal.name },
    });
    return goal;
  }

  async updateGoal(userId: string, projectId: string, goalId: string, dto: UpdateGoalDto) {
    await this.assertProjectMember(userId, projectId);
    const g = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!g || g.projectId !== projectId) throw new NotFoundException("Goal not found");
    return this.prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.emoji !== undefined && { emoji: dto.emoji }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
    });
  }

  async deleteGoal(userId: string, projectId: string, goalId: string) {
    await this.assertProjectMember(userId, projectId);
    const g = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!g || g.projectId !== projectId) throw new NotFoundException("Goal not found");
    await this.prisma.goal.update({ where: { id: goalId }, data: { deletedAt: new Date() } });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async assertProjectMember(userId: string, projectId: string) {
    const [member, project] = await Promise.all([
      this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { id: true },
      }),
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, ownerId: true },
      }),
    ]);
    if (!project) throw new NotFoundException("Project not found");
    if (!member && project.ownerId !== userId) throw new ForbiddenException("Not a project member");
  }

  private assertMember(project: { ownerId: string; members: { userId: string }[] }, userId: string) {
    const isMember =
      project.ownerId === userId ||
      project.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException("Not a project member");
  }

  private assertOwner(project: { ownerId: string }, userId: string) {
    if (project.ownerId !== userId) throw new ForbiddenException("Only owner can do this");
  }
}
