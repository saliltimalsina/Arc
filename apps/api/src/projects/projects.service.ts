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

const ITEM_INCLUDE = {
  assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
  subtasks: {
    orderBy: { position: "asc" as const },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  },
};

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

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

  async createProject(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        key: dto.key ? dto.key.toUpperCase().slice(0, 6) : this.deriveProjectKey(dto.name),
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
          orderBy: { position: "asc" },
          include: {
            items: {
              where: { parentId: null },
              orderBy: { position: "asc" },
              take: 200,
              include: ITEM_INCLUDE,
            },
          },
        },
        items: {
          where: { sprintId: null, parentId: null },
          orderBy: { position: "asc" },
          take: 200,
          include: ITEM_INCLUDE,
        },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        milestones: { orderBy: { position: "asc" } },
        goals: { orderBy: { position: "asc" } },
      },
    });

    if (!project) throw new NotFoundException("Project not found");
    this.assertMember(project, userId);
    return project;
  }

  async updateProject(userId: string, projectId: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException();
    this.assertOwner(project, userId);
    return this.prisma.project.update({ where: { id: projectId }, data: dto });
  }

  async deleteProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException();
    this.assertOwner(project, userId);
    await this.prisma.project.delete({ where: { id: projectId } });
  }

  async getMyActivity(userId: string) {
    const memberships = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = memberships.map(m => m.projectId);
    if (projectIds.length === 0) return [];

    const [items, comments, sprints] = await Promise.all([
      this.prisma.item.findMany({
        where: { projectId: { in: projectIds }, parentId: null },
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
        where: { item: { projectId: { in: projectIds } } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, body: true, createdAt: true,
          author: { select: { id: true, name: true } },
          item: { select: { id: true, title: true } },
        },
      }),
      this.prisma.sprint.findMany({
        where: { projectId: { in: projectIds }, status: { in: ["active", "completed"] } },
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
      .slice(0, 12);
  }

  async getProjectActivity(userId: string, projectId: string) {
    await this.assertProjectMember(userId, projectId);

    const [items, comments, sprints] = await Promise.all([
      this.prisma.item.findMany({
        where: { projectId, parentId: null },
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
        where: { item: { projectId } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, body: true, createdAt: true,
          author: { select: { id: true, name: true } },
          item: { select: { id: true, title: true } },
        },
      }),
      this.prisma.sprint.findMany({
        where: { projectId, status: { in: ["active", "completed"] } },
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
      .slice(0, 12);

    return events;
  }

  // ── Sprints ───────────────────────────────────────────────────────────────

  async listSprints(userId: string, projectId: string) {
    await this.assertProjectMember(userId, projectId);
    return this.prisma.sprint.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      include: {
        items: {
          where: { parentId: null },
          orderBy: { position: "asc" },
          include: ITEM_INCLUDE,
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
    return this.prisma.sprint.create({
      data: {
        projectId,
        name: dto.name,
        goal: dto.goal,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        position: (last?.position ?? -1) + 1,
      },
    });
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
      return this.prisma.$transaction([
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

    return this.prisma.sprint.update({
      where: { id: sprintId },
      data: { status: "completed" },
    });
  }

  async deleteSprint(userId: string, projectId: string, sprintId: string) {
    await this.assertProjectMember(userId, projectId);
    const sprint = await this.prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint || sprint.projectId !== projectId) throw new NotFoundException();
    // Move items to backlog before deleting sprint
    await this.prisma.item.updateMany({
      where: { sprintId },
      data: { sprintId: null },
    });
    await this.prisma.sprint.delete({ where: { id: sprintId } });
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  async listItems(userId: string, projectId: string, sprintId?: string) {
    await this.assertProjectMember(userId, projectId);
    return this.prisma.item.findMany({
      where: {
        projectId,
        parentId: null,
        sprintId: sprintId === "backlog" ? null : (sprintId ?? undefined),
      },
      orderBy: { position: "asc" },
      include: ITEM_INCLUDE,
    });
  }

  async createItem(userId: string, projectId: string, dto: CreateItemDto) {
    await this.assertProjectMember(userId, projectId);
    const [last, project] = await Promise.all([
      this.prisma.item.findFirst({
        where: { projectId, sprintId: dto.sprintId ?? null, parentId: dto.parentId ?? null },
        orderBy: { position: "desc" },
        select: { position: true },
      }),
      this.prisma.project.update({
        where: { id: projectId },
        data: { itemCounter: { increment: 1 } },
        select: { itemCounter: true },
      }),
    ]);
    return this.prisma.item.create({
      data: {
        projectId,
        number: project.itemCounter,
        sprintId: dto.sprintId ?? null,
        parentId: dto.parentId ?? null,
        title: dto.title,
        description: dto.description,
        type: dto.type ?? "story",
        status: dto.status ?? "To Do",
        priority: dto.priority ?? "medium",
        points: dto.points,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        position: (last?.position ?? -1) + 1,
      },
      include: ITEM_INCLUDE,
    });
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
    return this.prisma.item.update({
      where: { id: itemId },
      data: {
        ...dto,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
      },
      include: ITEM_INCLUDE,
    });
  }

  async setAssignee(userId: string, projectId: string, itemId: string, assigneeUserId: string | null) {
    await this.assertProjectMember(userId, projectId);
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.projectId !== projectId) throw new NotFoundException();
    await this.prisma.itemAssignee.deleteMany({ where: { itemId } });
    if (assigneeUserId) {
      await this.prisma.itemAssignee.create({ data: { itemId, userId: assigneeUserId } });
    }
    return this.prisma.item.findUnique({ where: { id: itemId }, include: ITEM_INCLUDE });
  }

  async deleteItem(userId: string, projectId: string, itemId: string) {
    await this.assertProjectMember(userId, projectId);
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.projectId !== projectId) throw new NotFoundException();
    await this.prisma.item.deleteMany({ where: { parentId: itemId } });
    await this.prisma.item.delete({ where: { id: itemId } });
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async listComments(userId: string, projectId: string, itemId: string) {
    await this.assertProjectMember(userId, projectId);
    return this.prisma.comment.findMany({
      where: { itemId },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  }

  async createComment(
    userId: string,
    projectId: string,
    itemId: string,
    dto: CreateCommentDto,
  ) {
    await this.assertProjectMember(userId, projectId);
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.projectId !== projectId) throw new NotFoundException();
    return this.prisma.comment.create({
      data: { itemId, authorId: userId, body: dto.body },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  }

  async deleteComment(userId: string, projectId: string, commentId: string) {
    await this.assertProjectMember(userId, projectId);
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException();
    if (comment.authorId !== userId) throw new ForbiddenException();
    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  // ── Me ────────────────────────────────────────────────────────────────────

  async getMyItems(userId: string) {
    return this.prisma.itemAssignee.findMany({
      where: { userId },
      include: {
        item: {
          include: {
            project: { select: { id: true, name: true, emoji: true, color: true, key: true } },
            assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        },
      },
    });
  }

  async getMyStats(userId: string) {
    const [activeProjects, openItems, inReview, completedItems] = await Promise.all([
      this.prisma.project.count({
        where: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
          status: "active",
        },
      }),
      this.prisma.itemAssignee.count({
        where: { userId, item: { status: { not: "Done" } } },
      }),
      this.prisma.itemAssignee.count({
        where: { userId, item: { status: "In Review" } },
      }),
      this.prisma.itemAssignee.count({
        where: { userId, item: { status: "Done" } },
      }),
    ]);
    return { activeProjects, openItems, inReview, completedItems, blockers: 0 };
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

    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
  }

  // ── Milestones ────────────────────────────────────────────────────────────

  async createMilestone(userId: string, projectId: string, dto: CreateMilestoneDto) {
    await this.assertProjectMember(userId, projectId);
    const count = await this.prisma.milestone.count({ where: { projectId } });
    return this.prisma.milestone.create({
      data: { projectId, name: dto.name, date: new Date(dto.date), position: dto.position ?? count },
    });
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
    await this.prisma.milestone.delete({ where: { id: milestoneId } });
  }

  // ── Goals ─────────────────────────────────────────────────────────────────

  async listGoals(userId: string, projectId: string) {
    await this.assertProjectMember(userId, projectId);
    return this.prisma.goal.findMany({ where: { projectId }, orderBy: { position: "asc" } });
  }

  async createGoal(userId: string, projectId: string, dto: CreateGoalDto) {
    await this.assertProjectMember(userId, projectId);
    const count = await this.prisma.goal.count({ where: { projectId } });
    return this.prisma.goal.create({
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
    await this.prisma.goal.delete({ where: { id: goalId } });
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
