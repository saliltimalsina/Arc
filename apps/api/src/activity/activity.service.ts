import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type ActivityEntityType =
  | "project" | "item" | "sprint" | "comment" | "goal" | "milestone" | "projectMember" | "team" | "teamMember";

export interface RecordActivityInput {
  actorId: string;
  projectId?: string | null;
  entityType: ActivityEntityType;
  entityId: string;
  kind: string;
  payload?: any;
}

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async record(input: RecordActivityInput) {
    return this.prisma.activity.create({
      data: {
        actorId: input.actorId,
        projectId: input.projectId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        kind: input.kind,
        payload: input.payload ?? undefined,
      },
    });
  }

  async listForProject(projectId: string, opts: { limit?: number; cursor?: string } = {}) {
    const take = Math.min(opts.limit ?? 50, 100);
    return this.prisma.activity.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      include: { actor: { select: { id: true, name: true, email: true } } },
    });
  }

  async listForEntity(entityType: ActivityEntityType, entityId: string, opts: { limit?: number } = {}) {
    const take = Math.min(opts.limit ?? 50, 100);
    return this.prisma.activity.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take,
      include: { actor: { select: { id: true, name: true, email: true } } },
    });
  }
}
