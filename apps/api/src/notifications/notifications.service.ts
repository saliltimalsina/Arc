import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateNotificationInput {
  recipientId: string;
  kind: string;
  entityType?: string;
  entityId?: string;
  payload?: any;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    if (!input.recipientId || !input.kind) return null;
    return this.prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        kind: input.kind,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        payload: input.payload ?? undefined,
      },
    });
  }

  async createMany(inputs: CreateNotificationInput[]) {
    const valid = inputs.filter(i => i.recipientId && i.kind);
    if (!valid.length) return { count: 0 };
    return this.prisma.notification.createMany({
      data: valid.map(i => ({
        recipientId: i.recipientId,
        kind: i.kind,
        entityType: i.entityType ?? null,
        entityId: i.entityId ?? null,
        payload: i.payload ?? undefined,
      })),
    });
  }

  async list(userId: string, opts: { unreadOnly?: boolean; limit?: number; cursor?: string } = {}) {
    const take = Math.min(opts.limit ?? 30, 100);
    return this.prisma.notification.findMany({
      where: { recipientId: userId, ...(opts.unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { recipientId: userId, readAt: null } });
  }

  async markRead(userId: string, id: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n || n.recipientId !== userId) throw new NotFoundException();
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
